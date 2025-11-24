using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;

namespace FanEngagement.Infrastructure.HealthChecks;

/// <summary>
/// Health check that verifies critical background services are registered and configured.
/// This is a readiness check - confirms services are configured, but not necessarily running yet.
/// </summary>
public class BackgroundServicesHealthCheck : IHealthCheck
{
    private readonly IEnumerable<IHostedService> _hostedServices;

    public BackgroundServicesHealthCheck(IEnumerable<IHostedService> hostedServices)
    {
        _hostedServices = hostedServices;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var serviceTypes = _hostedServices.Select(s => s.GetType().Name).ToList();
        
        // Check for critical background services
        var requiredServices = new[]
        {
            "ProposalLifecycleBackgroundService",
            "WebhookDeliveryBackgroundService"
        };

        var missingServices = requiredServices
            .Where(required => !serviceTypes.Any(s => s.Contains(required)))
            .ToList();

        if (missingServices.Any())
        {
            var data = new Dictionary<string, object>
            {
                ["configuredServices"] = serviceTypes,
                ["missingServices"] = missingServices
            };

            return Task.FromResult(
                HealthCheckResult.Degraded(
                    $"Missing critical background services: {string.Join(", ", missingServices)}",
                    data: data));
        }

        var data2 = new Dictionary<string, object>
        {
            ["configuredServices"] = serviceTypes,
            ["count"] = serviceTypes.Count
        };

        return Task.FromResult(
            HealthCheckResult.Healthy(
                "All critical background services are configured",
                data: data2));
    }
}
