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
        builder.ConfigureAppConfiguration((context, config) =>
        {
            // Override environment to ensure test behavior
            context.HostingEnvironment.EnvironmentName = "Testing";
        });

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

            // Remove all DbContext-related registrations completely
            // We need to do this before any service provider is built
            services.RemoveAll<DbContextOptions<FanEngagementDbContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<FanEngagementDbContext>();

            // Add in-memory database for testing
            services.AddDbContext<FanEngagementDbContext>((sp, options) =>
            {
                options.UseInMemoryDatabase(_databaseName);
            });
        });

        builder.UseEnvironment("Testing");
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            try
            {
                using var scope = Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
                db.Database.EnsureDeleted();
            }
            catch
            {
                // Ignore cleanup errors in tests
            }
        }
        base.Dispose(disposing);
    }
}
