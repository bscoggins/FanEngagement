using System.Threading.Channels;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.DevDataSeeding;
using FanEngagement.Application.Encryption;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.OutboundEvents;
using FanEngagement.Application.Proposals;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Application.WebhookEndpoints;
using FanEngagement.Domain.Entities;
using FanEngagement.Infrastructure.BackgroundServices;
using FanEngagement.Infrastructure.Configuration;
using FanEngagement.Infrastructure.HealthChecks;
using FanEngagement.Infrastructure.Metrics;
using FanEngagement.Infrastructure.Persistence;
using FanEngagement.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace FanEngagement.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.AddDbContext<FanEngagementDbContext>(options =>
        {
            options.UseNpgsql(connectionString);
        });

        services.AddScoped<IOrganizationService, OrganizationService>();
        services.AddScoped<IShareTypeService, ShareTypeService>();
        services.AddScoped<IShareIssuanceService, ShareIssuanceService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IMembershipService, MembershipService>();
        services.AddScoped<IProposalService, ProposalService>();
        services.AddScoped<IWebhookEndpointService, WebhookEndpointService>();
        services.AddScoped<IOutboundEventService, OutboundEventService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IDevDataSeedingService, DevDataSeedingService>();
        services.AddSingleton<IEncryptionService, AesEncryptionService>();

        // Configure audit services
        services.Configure<AuditOptions>(
            configuration.GetSection("Audit"));
        
        // Get audit options for channel configuration
        var auditOptions = configuration.GetSection("Audit").Get<AuditOptions>() ?? new AuditOptions();
        
        // Channel with bounded capacity to prevent memory issues
        services.AddSingleton(Channel.CreateBounded<AuditEvent>(new BoundedChannelOptions(auditOptions.ChannelCapacity)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        }));
        services.AddScoped<IAuditService, AuditService>();
        services.AddHostedService<AuditPersistenceBackgroundService>();

        // Configure background services
        services.Configure<ProposalLifecycleOptions>(
            configuration.GetSection("ProposalLifecycle"));
        
        services.Configure<AuditRetentionOptions>(
            configuration.GetSection("AuditRetention"));
        
        services.AddHttpClient();
        services.AddHostedService<WebhookDeliveryBackgroundService>();
        services.AddHostedService<ProposalLifecycleBackgroundService>();
        services.AddHostedService<AuditRetentionBackgroundService>();

        // Configure metrics - AddMetrics() registers IMeterFactory
        services.AddMetrics();
        services.AddSingleton<FanEngagementMetrics>();

        // Configure health checks
        services.AddHealthChecks()
            .AddCheck<BackgroundServicesHealthCheck>(
                "background_services",
                failureStatus: HealthStatus.Degraded,
                tags: new[] { "ready" })
            .AddDbContextCheck<FanEngagementDbContext>(
                "database",
                failureStatus: HealthStatus.Unhealthy,
                tags: new[] { "ready", "db" })
            .AddNpgSql(
                connectionString,
                name: "postgresql",
                failureStatus: HealthStatus.Unhealthy,
                tags: new[] { "ready", "db" });

        return services;
    }
}
