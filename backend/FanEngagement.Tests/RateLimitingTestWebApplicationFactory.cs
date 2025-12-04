using FanEngagement.Api;
using FanEngagement.Infrastructure.BackgroundServices;
using FanEngagement.Infrastructure.HealthChecks;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace FanEngagement.Tests;

/// <summary>
/// Test factory specifically for rate limiting tests.
/// Uses the default (lower) rate limits to properly test rate limiting behavior.
/// </summary>
public class RateLimitingTestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"TestDb_{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Use default rate limits for rate limiting tests (not overridden)
        // This allows us to test actual rate limiting behavior
        
        builder.ConfigureServices(services =>
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
        });
    }
}
