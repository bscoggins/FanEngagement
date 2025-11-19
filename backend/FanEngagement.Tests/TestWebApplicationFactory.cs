using FanEngagement.Api;
using FanEngagement.Infrastructure.BackgroundServices;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace FanEngagement.Tests;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"TestDb_{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove background service that accesses database
            var hostedServiceDescriptor = services.FirstOrDefault(d => 
                d.ServiceType == typeof(IHostedService) && 
                d.ImplementationType == typeof(WebhookDeliveryBackgroundService));
            if (hostedServiceDescriptor != null)
            {
                services.Remove(hostedServiceDescriptor);
            }

            // Remove the existing DbContext registration
            services.RemoveAll<DbContextOptions<FanEngagementDbContext>>();
            services.RemoveAll<FanEngagementDbContext>();

            // Add in-memory database for testing - use a shared database name per factory instance
            services.AddDbContext<FanEngagementDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
            });

            // Build the service provider and ensure database is created
            var serviceProvider = services.BuildServiceProvider();
            using var scope = serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
            db.Database.EnsureCreated();
        });
    }
}
