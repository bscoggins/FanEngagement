using FanEngagement.Api;
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

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"TestDb_{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
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

            // Remove PostgreSQL health check registration (can't connect to DB in test environment)
            // Keep only the DbContext and BackgroundServices checks which work with InMemory DB
            var healthCheckRegistrations = services
                .Where(d => d.ImplementationType != null && 
                           d.ImplementationType.Namespace != null &&
                           d.ImplementationType.Namespace.StartsWith("HealthChecks.NpgSql"))
                .ToList();
            
            foreach (var registration in healthCheckRegistrations)
            {
                services.Remove(registration);
            }

            // Build the service provider and ensure database is created
            var serviceProvider = services.BuildServiceProvider();
            using var scope = serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
            db.Database.EnsureCreated();
        });
    }
}
