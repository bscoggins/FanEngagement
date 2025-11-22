using System.Text;
using System.Text.Json.Serialization;
using FanEngagement.Api.Authorization;
using FanEngagement.Infrastructure;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddOpenApi();
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

// Apply pending migrations on startup (best-effort; keep controllers thin)
// Skip migrations for InMemory database (used in tests)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        if (dbContext.Database.IsRelational())
        {
            dbContext.Database.Migrate();
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while applying database migrations.");
        // Optionally: rethrow or exit, depending on requirements
    }
}

// Seed initial admin user in development
if (app.Environment.IsDevelopment())
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
    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();

// Enable CORS
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
