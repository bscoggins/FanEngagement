using System.Text;
using FanEngagement.Infrastructure;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
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

builder.Services.AddAuthorization();

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
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var authService = scope.ServiceProvider.GetRequiredService<FanEngagement.Application.Authentication.IAuthService>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        
        // Check if admin user already exists
        var adminEmail = "admin@example.com";
        var adminExists = await dbContext.Users.AnyAsync(u => u.Email == adminEmail);
        
        if (!adminExists)
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
        else
        {
            logger.LogInformation("Admin user already exists: {Email}", adminEmail);
        }
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
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
