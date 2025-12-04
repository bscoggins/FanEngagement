using FanEngagement.Api;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Infrastructure.BackgroundServices;
using FanEngagement.Infrastructure.HealthChecks;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;

namespace FanEngagement.Tests;

/// <summary>
/// Base class for test web application factories.
/// Provides common configuration for test database and service setup.
/// </summary>
public abstract class TestWebApplicationFactoryBase : WebApplicationFactory<Program>
{
    private const string TestDatabaseNamePrefix = "TestDb_";
    private readonly string _databaseName = $"{TestDatabaseNamePrefix}{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        ConfigureTestSpecificSettings(builder);

        builder.ConfigureServices(services =>
        {
            ConfigureCommonTestServices(services);
        });
    }

    /// <summary>
    /// Override this method to configure test-specific settings like rate limits.
    /// </summary>
    protected virtual void ConfigureTestSpecificSettings(IWebHostBuilder builder)
    {
        // Default: no additional configuration
    }

    /// <summary>
    /// Configures common services for all test factories (database, background services, health checks).
    /// </summary>
    protected void ConfigureCommonTestServices(IServiceCollection services)
    {
        // Remove background services that access database
        var webhookServiceDescriptor = services.FirstOrDefault(d => 
            d.ServiceType == typeof(IHostedService) && 
            d.ImplementationType == typeof(WebhookDeliveryBackgroundService));
        if (webhookServiceDescriptor != null)
        {
            services.Remove(webhookServiceDescriptor);
        }

        var lifecycleServiceDescriptor = services.FirstOrDefault(d => 
            d.ServiceType == typeof(IHostedService) && 
            d.ImplementationType == typeof(ProposalLifecycleBackgroundService));
        if (lifecycleServiceDescriptor != null)
        {
            services.Remove(lifecycleServiceDescriptor);
        }

        // Remove the existing DbContext registration
        services.RemoveAll<DbContextOptions<FanEngagementDbContext>>();
        services.RemoveAll<FanEngagementDbContext>();

        // Add in-memory database for testing - use a shared database name per factory instance
        services.AddDbContext<FanEngagementDbContext>(options =>
        {
            options.UseInMemoryDatabase(_databaseName);
        });

        // Remove PostgreSQL health check by reconfiguring health check options
        services.Configure<HealthCheckServiceOptions>(options =>
        {
            // Remove the "postgresql" health check registration that requires real DB connection
            var postgresCheck = options.Registrations.FirstOrDefault(r => r.Name == "postgresql");
            if (postgresCheck != null)
            {
                options.Registrations.Remove(postgresCheck);
            }
        });

        // Build the service provider and ensure database is created
        var serviceProvider = services.BuildServiceProvider();
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        db.Database.EnsureCreated();
    }

    /// <summary>
    /// Helper method to create a test user directly in the database, bypassing rate limiting.
    /// This is useful for tests that need users without consuming registration rate limit quota.
    /// </summary>
    public async Task<User> CreateTestUserDirectlyAsync(CreateUserRequest request)
    {
        if (request == null)
            throw new ArgumentNullException(nameof(request));
        if (string.IsNullOrEmpty(request.Email))
            throw new ArgumentException("Email is required", nameof(request));
        if (string.IsNullOrEmpty(request.DisplayName))
            throw new ArgumentException("DisplayName is required", nameof(request));
        if (string.IsNullOrEmpty(request.Password))
            throw new ArgumentException("Password is required", nameof(request));

        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
        
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            DisplayName = request.DisplayName,
            PasswordHash = authService.HashPassword(request.Password),
            Role = Domain.Enums.UserRole.User,
            CreatedAt = DateTimeOffset.UtcNow
        };
        
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();
        
        return user;
    }
}
