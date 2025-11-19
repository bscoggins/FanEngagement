using System.Security.Cryptography;
using System.Text;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.BackgroundServices;

/// <summary>
/// Background service that processes pending webhook delivery events.
/// Polls for pending OutboundEvents every 30 seconds (configurable), finds matching
/// webhook endpoints, and delivers events via HTTP POST with HMAC-SHA256 signatures.
/// </summary>
/// <remarks>
/// <para>Retry Strategy: Events are retried up to 3 times before being marked as Failed.</para>
/// <para>HMAC Signature: Sent in X-Webhook-Signature header as hex-encoded HMAC-SHA256 of the payload.</para>
/// <para>Behavior: If no matching endpoints exist for an event, it remains Pending to allow for future subscriptions.</para>
/// </remarks>
public class WebhookDeliveryBackgroundService(
    IServiceProvider serviceProvider,
    IHttpClientFactory httpClientFactory,
    ILogger<WebhookDeliveryBackgroundService> logger) : BackgroundService
{
    private const int MaxRetries = 3;
    private const int PollingIntervalSeconds = 30;
    private const int MaxEventsPerBatch = 100;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("WebhookDeliveryBackgroundService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingEventsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful cancellation, exit loop
                break;
            }
            catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
            {
                logger.LogError(ex, "Error processing pending webhook events");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(PollingIntervalSeconds), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful cancellation during delay
                break;
            }
        }

        logger.LogInformation("WebhookDeliveryBackgroundService stopped");
    }

    private async Task ProcessPendingEventsAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();

        // Get pending events - Note: In production with multiple workers, consider using
        // database-level locking (e.g., FOR UPDATE SKIP LOCKED) to prevent duplicate processing
        var pendingEvents = await dbContext.OutboundEvents
            .Where(e => e.Status == OutboundEventStatus.Pending)
            .OrderBy(e => e.CreatedAt)
            .Take(MaxEventsPerBatch)
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
                // Save changes after each event to isolate failures
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (HttpRequestException ex)
            {
                logger.LogError(ex, "HTTP error processing event {EventId}", outboundEvent.Id);
            }
            catch (DbUpdateException ex)
            {
                logger.LogError(ex, "Database update error processing event {EventId}", outboundEvent.Id);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                // Graceful cancellation
                break;
            }
            catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
            {
                logger.LogError(ex, "Unexpected error processing event {EventId}", outboundEvent.Id);
            }
        }
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

        // Filter by subscribed events - use exact case-sensitive matching for consistency
        var matchingEndpoints = webhookEndpoints
            .Where(w => w.SubscribedEvents.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Any(e => e.Trim().Equals(outboundEvent.EventType, StringComparison.Ordinal)))
            .ToList();

        if (matchingEndpoints.Count == 0)
        {
            logger.LogWarning(
                "No active webhook endpoints found for organization {OrganizationId} and event type {EventType}. Event remains Pending.",
                outboundEvent.OrganizationId,
                outboundEvent.EventType);
            
            // Keep event as Pending to allow for future webhook subscriptions
            // This prevents losing events when endpoints are added later
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
            catch (HttpRequestException ex)
            {
                logger.LogError(
                    ex,
                    "HTTP error delivering event {EventId} to endpoint {EndpointId}",
                    outboundEvent.Id,
                    endpoint.Id);
                allSucceeded = false;
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw; // Re-throw to propagate cancellation
            }
            catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
            {
                logger.LogError(
                    ex,
                    "Unexpected error delivering event {EventId} to endpoint {EndpointId}",
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
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint.Url)
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
        catch (HttpRequestException ex)
        {
            logger.LogError(
                ex,
                "HTTP error delivering event {EventId} to endpoint {EndpointUrl}",
                outboundEvent.Id,
                endpoint.Url);
            return false;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(
                "Delivery of event {EventId} to endpoint {EndpointUrl} was cancelled",
                outboundEvent.Id,
                endpoint.Url);
            return false;
        }
        catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
        {
            logger.LogError(
                ex,
                "Unexpected error delivering event {EventId} to endpoint {EndpointUrl}",
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
