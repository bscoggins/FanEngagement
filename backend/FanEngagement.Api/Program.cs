using System.Net;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FanEngagement.Api.Authorization;
using FanEngagement.Api.Middleware;
using FanEngagement.Application.Validators;
using FanEngagement.Infrastructure;
using FanEngagement.Infrastructure.Persistence;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Register FluentValidation validators and enable automatic validation for all request DTOs
builder.Services.AddValidatorsFromAssemblyContaining<CreateUserRequestValidator>();
builder.Services.AddFluentValidationAutoValidation();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddOpenApi();

// Configure Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Version = "v1",
        Title = "FanEngagement API",
        Description = "A multi-tenant fan governance platform API for organizations to issue share types to users for voting on proposals.",
        Contact = new OpenApiContact
        {
            Name = "FanEngagement Team"
        }
    });

    // Add JWT Authentication to Swagger
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter your token in the text input below.\r\n\r\nExample: \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddInfrastructure(builder.Configuration);

// Configure CORS to allow frontend access
var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"];
string[] origins;
if (!string.IsNullOrWhiteSpace(allowedOrigins))
{
    origins = allowedOrigins
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
else
{
    // Default to localhost for development if not set
    origins = new[] { "http://localhost:3000", "http://localhost:5173" };
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(origins)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure rate limiting for audit export endpoints
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    
    // Per-user rate limiter for audit exports: 5 exports per hour per user
    options.AddPolicy("AuditExportPerUser", httpContext =>
    {
        // Partition by user ID so each user has their own rate limit
        var userId = httpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
        return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("RateLimiting:AuditExport:PermitLimit", 5),
            Window = TimeSpan.FromHours(builder.Configuration.GetValue("RateLimiting:AuditExport:WindowHours", 1.0)),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });

    // Per-IP rate limiter for login endpoint: 5 attempts per minute per IP
    options.AddPolicy("Login", httpContext =>
    {
        // Partition by IP address so each IP has their own rate limit
        var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ipAddress, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("RateLimiting:Login:PermitLimit", 5),
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("RateLimiting:Login:WindowMinutes", 1)),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });

    // Per-IP rate limiter for registration endpoint: 10 attempts per hour per IP
    options.AddPolicy("Registration", httpContext =>
    {
        // Partition by IP address so each IP has their own rate limit
        var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ipAddress, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("RateLimiting:Registration:PermitLimit", 10),
            Window = TimeSpan.FromHours(builder.Configuration.GetValue("RateLimiting:Registration:WindowHours", 1)),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });

    // Configure custom rejection response with Retry-After header
    // NOTE: This OnRejected handler applies globally to ALL rate limiting policies
    // (Login, Registration, and AuditExportPerUser). All rejected requests will
    // receive the same ProblemDetails format. If different policies need different
    // rejection messages in the future, this handler would need to check which
    // policy was triggered (e.g., via context metadata).
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = retryAfter.TotalSeconds.ToString();
        }

        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc6585#section-4",
            title = "Too Many Requests",
            status = 429,
            detail = "Rate limit exceeded. Please try again later."
        }, cancellationToken: token);
    };
});

// Configure JWT authentication
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];
var jwtSigningKey = builder.Configuration["Jwt:SigningKey"];

if (string.IsNullOrEmpty(jwtIssuer))
{
    throw new InvalidOperationException("JWT Issuer is not configured. Please set Jwt:Issuer in appsettings.json or environment variables.");
}

if (string.IsNullOrEmpty(jwtAudience))
{
    throw new InvalidOperationException("JWT Audience is not configured. Please set Jwt:Audience in appsettings.json or environment variables.");
}

if (string.IsNullOrEmpty(jwtSigningKey))
{
    throw new InvalidOperationException("JWT SigningKey is not configured or is empty. Please set a valid Jwt:SigningKey in appsettings.json or environment variables. This key is required to sign and validate JWT tokens.");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey)),
        RoleClaimType = System.Security.Claims.ClaimTypes.Role
    };
});

// Register authorization handlers
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAuthorizationHandler, OrganizationMemberHandler>();
builder.Services.AddScoped<IAuthorizationHandler, OrganizationAdminHandler>();
builder.Services.AddScoped<IAuthorizationHandler, ProposalManagerHandler>();
builder.Services.AddScoped<IAuthorizationHandler, ProposalMemberHandler>();

// Configure authorization policies
builder.Services.AddAuthorization(options =>
{
    // Policy: User must be a Global Admin
    options.AddPolicy("GlobalAdmin", policy =>
        policy.RequireRole("Admin"));

    // Policy: User must be a member of the organization in the route (or Global Admin)
    options.AddPolicy("OrgMember", policy =>
        policy.Requirements.Add(new OrganizationMemberRequirement()));

    // Policy: User must be an OrgAdmin of the organization in the route (or Global Admin)
    options.AddPolicy("OrgAdmin", policy =>
        policy.Requirements.Add(new OrganizationAdminRequirement()));

    // Policy: User must be the proposal creator, OrgAdmin of the org, or Global Admin
    options.AddPolicy("ProposalManager", policy =>
        policy.Requirements.Add(new ProposalManagerRequirement()));
});

var app = builder.Build();

// Configure forwarded headers for nginx-proxy-manager reverse proxy
var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};

// Clear default values to restrict trusted sources
forwardedHeadersOptions.KnownProxies.Clear();
forwardedHeadersOptions.KnownNetworks.Clear();

// Trust Docker subnet (172.24.0.0/16) where nginx-proxy-manager runs
forwardedHeadersOptions.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(IPAddress.Parse("172.24.0.0"), 16));

// Trust Docker gateway (nginx-proxy-manager host)
forwardedHeadersOptions.KnownProxies.Add(IPAddress.Parse("172.24.0.1"));

app.UseForwardedHeaders(forwardedHeadersOptions);

// Apply pending migrations on startup (best-effort; keep controllers thin)
// Skip migrations for InMemory database (used in tests)
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    if (dbContext.Database.IsRelational())
    {
        try
        {
            dbContext.Database.Migrate();
            logger.LogInformation("Database migrations applied successfully.");
            
            // Encrypt existing plaintext webhook secrets if needed
            await FanEngagement.Infrastructure.Persistence.Migrations.WebhookSecretEncryptionMigration
                .EncryptExistingSecretsAsync(dbContext, configuration, logger);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error applying database migrations. Shutting down.");
            throw; // Important: let the container crash so Docker restarts it
        }
    }
}

// Ensure admin user exists in non-production environments
if (!app.Environment.IsProduction())
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var authService = scope.ServiceProvider.GetRequiredService<FanEngagement.Application.Authentication.IAuthService>();
        
        // Check if admin user already exists and ensure it has Admin role
        var adminEmail = "admin@example.com";
        var existingUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);
        
        if (existingUser == null)
        {
            var adminUser = new FanEngagement.Domain.Entities.User
            {
                Id = Guid.NewGuid(),
                Email = adminEmail,
                DisplayName = "Admin User",
                PasswordHash = authService.HashPassword("Admin123!"),
                Role = FanEngagement.Domain.Enums.UserRole.Admin,
                CreatedAt = DateTimeOffset.UtcNow
            };
            
            dbContext.Users.Add(adminUser);
            await dbContext.SaveChangesAsync();
            logger.LogInformation("Initial admin user created: {Email}", adminEmail);
        }
        else if (existingUser.Role != FanEngagement.Domain.Enums.UserRole.Admin)
        {
            existingUser.Role = FanEngagement.Domain.Enums.UserRole.Admin;
            await dbContext.SaveChangesAsync();
            logger.LogInformation("Existing user elevated to Admin role: {Email}", adminEmail);
        }
        else
        {
            logger.LogInformation("Admin user already exists with Admin role: {Email}", adminEmail);
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while seeding the admin user.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Don't use UseDeveloperExceptionPage - we use our global exception handler
}

// Enable Swagger UI in non-production environments (Development, Docker with Development env)
if (!app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "FanEngagement API v1");
        options.RoutePrefix = "swagger";
    });
}

// Add correlation ID middleware (before exception handler to ensure correlation IDs in error logs)
app.UseMiddleware<CorrelationIdMiddleware>();

// Add global exception handling middleware
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

app.UseHttpsRedirection();

// Enable CORS
app.UseCors("AllowFrontend");

app.UseAuthentication();

// Add rate limiting middleware
app.UseRateLimiter();

// Add authorization auditing middleware (must be between UseAuthentication and UseAuthorization)
app.UseMiddleware<AuditingAuthorizationMiddleware>();

app.UseAuthorization();

app.MapControllers();

// Map health check endpoints
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false // No checks, just liveness (app is running)
});

app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready") // Only readiness checks
});

app.Run();

public partial class Program;
