using System.Security.Cryptography;
using System.Text;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.BackgroundServices;

public class WebhookDeliveryBackgroundService(
    IServiceProvider serviceProvider,
    IHttpClientFactory httpClientFactory,
    ILogger<WebhookDeliveryBackgroundService> logger) : BackgroundService
{
    private const int MaxRetries = 3;
    private const int PollingIntervalSeconds = 30;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("WebhookDeliveryBackgroundService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingEventsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing pending webhook events");
            }

            await Task.Delay(TimeSpan.FromSeconds(PollingIntervalSeconds), stoppingToken);
        }

        logger.LogInformation("WebhookDeliveryBackgroundService stopped");
    }

    private async Task ProcessPendingEventsAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();

        // Get pending events
        var pendingEvents = await dbContext.OutboundEvents
            .Where(e => e.Status == OutboundEventStatus.Pending)
            .OrderBy(e => e.CreatedAt)
            .Take(100) // Process in batches
            .ToListAsync(cancellationToken);

        if (pendingEvents.Count == 0)
        {
            return;
        }

        logger.LogInformation("Processing {Count} pending webhook events", pendingEvents.Count);

        foreach (var outboundEvent in pendingEvents)
        {
            try
            {
                await ProcessEventAsync(dbContext, outboundEvent, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing event {EventId}", outboundEvent.Id);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task ProcessEventAsync(
        FanEngagementDbContext dbContext,
        Domain.Entities.OutboundEvent outboundEvent,
        CancellationToken cancellationToken)
    {
        // Find active webhook endpoints for this organization subscribed to this event type
        var webhookEndpoints = await dbContext.WebhookEndpoints
            .Where(w => w.OrganizationId == outboundEvent.OrganizationId 
                     && w.IsActive)
            .ToListAsync(cancellationToken);

        // Filter by subscribed events
        var matchingEndpoints = webhookEndpoints
            .Where(w => w.SubscribedEvents.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Any(e => e.Trim().Equals(outboundEvent.EventType, StringComparison.OrdinalIgnoreCase)))
            .ToList();

        if (matchingEndpoints.Count == 0)
        {
            logger.LogWarning(
                "No active webhook endpoints found for organization {OrganizationId} and event type {EventType}",
                outboundEvent.OrganizationId,
                outboundEvent.EventType);
            
            // Mark as delivered since there are no endpoints to deliver to
            outboundEvent.Status = OutboundEventStatus.Delivered;
            outboundEvent.AttemptCount++;
            outboundEvent.LastAttemptAt = DateTimeOffset.UtcNow;
            return;
        }

        var httpClient = httpClientFactory.CreateClient();
        var allSucceeded = true;

        foreach (var endpoint in matchingEndpoints)
        {
            try
            {
                var success = await DeliverToEndpointAsync(
                    httpClient,
                    endpoint,
                    outboundEvent,
                    cancellationToken);

                if (!success)
                {
                    allSucceeded = false;
                }
            }
            catch (Exception ex)
            {
                logger.LogError(
                    ex,
                    "Failed to deliver event {EventId} to endpoint {EndpointId}",
                    outboundEvent.Id,
                    endpoint.Id);
                allSucceeded = false;
            }
        }

        // Update event status
        outboundEvent.AttemptCount++;
        outboundEvent.LastAttemptAt = DateTimeOffset.UtcNow;

        if (allSucceeded)
        {
            outboundEvent.Status = OutboundEventStatus.Delivered;
            logger.LogInformation(
                "Successfully delivered event {EventId} to all endpoints",
                outboundEvent.Id);
        }
        else if (outboundEvent.AttemptCount >= MaxRetries)
        {
            outboundEvent.Status = OutboundEventStatus.Failed;
            logger.LogWarning(
                "Event {EventId} failed after {AttemptCount} attempts",
                outboundEvent.Id,
                outboundEvent.AttemptCount);
        }
        else
        {
            logger.LogWarning(
                "Event {EventId} delivery partially failed, will retry (attempt {AttemptCount}/{MaxRetries})",
                outboundEvent.Id,
                outboundEvent.AttemptCount,
                MaxRetries);
        }
    }

    private async Task<bool> DeliverToEndpointAsync(
        HttpClient httpClient,
        Domain.Entities.WebhookEndpoint endpoint,
        Domain.Entities.OutboundEvent outboundEvent,
        CancellationToken cancellationToken)
    {
        try
        {
            // Create HMAC signature
            var signature = GenerateHmacSignature(outboundEvent.Payload, endpoint.Secret);

            // Prepare request
            var request = new HttpRequestMessage(HttpMethod.Post, endpoint.Url)
            {
                Content = new StringContent(outboundEvent.Payload, Encoding.UTF8, "application/json")
            };

            // Add headers
            request.Headers.Add("X-Webhook-Signature", signature);
            request.Headers.Add("X-Event-Type", outboundEvent.EventType);
            request.Headers.Add("X-Event-Id", outboundEvent.Id.ToString());
            request.Headers.Add("X-Organization-Id", outboundEvent.OrganizationId.ToString());

            // Send request with timeout
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(30));

            var response = await httpClient.SendAsync(request, cts.Token);

            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation(
                    "Successfully delivered event {EventId} to endpoint {EndpointUrl}",
                    outboundEvent.Id,
                    endpoint.Url);
                return true;
            }
            else
            {
                logger.LogWarning(
                    "Failed to deliver event {EventId} to endpoint {EndpointUrl}. Status: {StatusCode}",
                    outboundEvent.Id,
                    endpoint.Url,
                    response.StatusCode);
                return false;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Exception delivering event {EventId} to endpoint {EndpointUrl}",
                outboundEvent.Id,
                endpoint.Url);
            return false;
        }
    }

    private static string GenerateHmacSignature(string payload, string secret)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        using var hmac = new HMACSHA256(keyBytes);
        var hashBytes = hmac.ComputeHash(payloadBytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}
