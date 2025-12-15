using System.Security.Cryptography;
using System.Text;
using FanEngagement.Application.Encryption;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Metrics;
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
    private const int MaxErrorLength = 1000;

    /// <summary>
    /// Result of a webhook delivery attempt.
    /// </summary>
    private record DeliveryResult(bool Success, string? Error);

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
        var encryptionService = scope.ServiceProvider.GetRequiredService<IEncryptionService>();
        var metrics = scope.ServiceProvider.GetService<FanEngagementMetrics>();

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

        logger.LogInformation(
            "Processing {Count} pending webhook events",
            pendingEvents.Count);

        foreach (var outboundEvent in pendingEvents)
        {
            try
            {
                await ProcessEventAsync(dbContext, encryptionService, outboundEvent, metrics, cancellationToken);
                // Save changes after each event to isolate failures
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (HttpRequestException ex)
            {
                logger.LogError(
                    ex,
                    "HTTP error processing event {EventId} (EventType: {EventType}, OrgId: {OrganizationId})",
                    outboundEvent.Id,
                    outboundEvent.EventType,
                    outboundEvent.OrganizationId);
            }
            catch (DbUpdateException ex)
            {
                logger.LogError(
                    ex,
                    "Database update error processing event {EventId} (EventType: {EventType}, OrgId: {OrganizationId})",
                    outboundEvent.Id,
                    outboundEvent.EventType,
                    outboundEvent.OrganizationId);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                // Graceful cancellation
                break;
            }
            catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
            {
                logger.LogError(
                    ex,
                    "Unexpected error processing event {EventId} (EventType: {EventType}, OrgId: {OrganizationId})",
                    outboundEvent.Id,
                    outboundEvent.EventType,
                    outboundEvent.OrganizationId);
            }
        }
    }

    private async Task ProcessEventAsync(
        FanEngagementDbContext dbContext,
        IEncryptionService encryptionService,
        Domain.Entities.OutboundEvent outboundEvent,
        FanEngagementMetrics? metrics,
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
                "No active webhook endpoints found for organization {OrganizationId} and event type {EventType} (EventId: {EventId}). Event remains Pending.",
                outboundEvent.OrganizationId,
                outboundEvent.EventType,
                outboundEvent.Id);
            
            // Treat "no endpoints" as an attempt so we don't loop forever
            outboundEvent.LastAttemptAt = DateTimeOffset.UtcNow;
            outboundEvent.AttemptCount++;
            outboundEvent.LastError = "No active webhook endpoints found";

            if (outboundEvent.AttemptCount >= MaxRetries)
            {
                outboundEvent.Status = OutboundEventStatus.Failed;
                logger.LogWarning("Event {EventId} failed after {MaxRetries} attempts with no subscribers.", outboundEvent.Id, MaxRetries);
            }
            
            return;
        }

        var httpClient = httpClientFactory.CreateClient();
        var allSucceeded = true;
        var errors = new List<string>();

        foreach (var endpoint in matchingEndpoints)
        {
            try
            {
                var result = await DeliverToEndpointAsync(
                    httpClient,
                    encryptionService,
                    endpoint,
                    outboundEvent,
                    cancellationToken);

                if (!result.Success)
                {
                    allSucceeded = false;
                    if (!string.IsNullOrEmpty(result.Error))
                    {
                        errors.Add(result.Error);
                    }
                }
                
                // Record metrics for each delivery attempt
                metrics?.RecordWebhookDelivery(result.Success, outboundEvent.EventType, outboundEvent.OrganizationId);
            }
            catch (HttpRequestException ex)
            {
                logger.LogError(
                    ex,
                    "HTTP error delivering event {EventId} (EventType: {EventType}) to endpoint {EndpointId} (OrgId: {OrganizationId})",
                    outboundEvent.Id,
                    outboundEvent.EventType,
                    endpoint.Id,
                    outboundEvent.OrganizationId);
                allSucceeded = false;
                errors.Add($"HTTP error: {ex.Message}");
                metrics?.RecordWebhookDelivery(false, outboundEvent.EventType, outboundEvent.OrganizationId);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw; // Re-throw to propagate cancellation
            }
            catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
            {
                logger.LogError(
                    ex,
                    "Unexpected error delivering event {EventId} (EventType: {EventType}) to endpoint {EndpointId} (OrgId: {OrganizationId})",
                    outboundEvent.Id,
                    outboundEvent.EventType,
                    endpoint.Id,
                    outboundEvent.OrganizationId);
                allSucceeded = false;
                errors.Add($"Unexpected error: {ex.Message}");
                metrics?.RecordWebhookDelivery(false, outboundEvent.EventType, outboundEvent.OrganizationId);
            }
        }

        // Update event status
        outboundEvent.AttemptCount++;
        outboundEvent.LastAttemptAt = DateTimeOffset.UtcNow;

        if (allSucceeded)
        {
            outboundEvent.Status = OutboundEventStatus.Delivered;
            outboundEvent.LastError = null;
            logger.LogInformation(
                "Successfully delivered event {EventId} (EventType: {EventType}, OrgId: {OrganizationId}) to all endpoints",
                outboundEvent.Id,
                outboundEvent.EventType,
                outboundEvent.OrganizationId);
        }
        else
        {
            // Combine errors and truncate if necessary
            var combinedError = string.Join("; ", errors);
            outboundEvent.LastError = TruncateError(combinedError);

            if (outboundEvent.AttemptCount >= MaxRetries)
            {
                outboundEvent.Status = OutboundEventStatus.Failed;
                logger.LogWarning(
                    "Event {EventId} (EventType: {EventType}, OrgId: {OrganizationId}) failed after {AttemptCount} attempts. LastError: {LastError}",
                    outboundEvent.Id,
                    outboundEvent.EventType,
                    outboundEvent.OrganizationId,
                    outboundEvent.AttemptCount,
                    outboundEvent.LastError);
            }
            else
            {
                logger.LogWarning(
                    "Event {EventId} (EventType: {EventType}, OrgId: {OrganizationId}) delivery partially failed, will retry (attempt {AttemptCount}/{MaxRetries}). LastError: {LastError}",
                    outboundEvent.Id,
                    outboundEvent.EventType,
                    outboundEvent.OrganizationId,
                    outboundEvent.AttemptCount,
                    MaxRetries,
                    outboundEvent.LastError);
            }
        }
    }

    private async Task<DeliveryResult> DeliverToEndpointAsync(
        HttpClient httpClient,
        IEncryptionService encryptionService,
        Domain.Entities.WebhookEndpoint endpoint,
        Domain.Entities.OutboundEvent outboundEvent,
        CancellationToken cancellationToken)
    {
        try
        {
            // Decrypt the secret for HMAC signature generation
            var decryptedSecret = encryptionService.Decrypt(endpoint.EncryptedSecret);
            
            // Create HMAC signature
            var signature = GenerateHmacSignature(outboundEvent.Payload, decryptedSecret);

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
                    "Successfully delivered event {EventId} (EventType: {EventType}, OrgId: {OrganizationId}) to endpoint {EndpointUrl} (EndpointId: {EndpointId}), Status: {StatusCode}",
                    outboundEvent.Id,
                    outboundEvent.EventType,
                    outboundEvent.OrganizationId,
                    endpoint.Url,
                    endpoint.Id,
                    (int)response.StatusCode);
                return new DeliveryResult(true, null);
            }
            else
            {
                var error = $"HTTP {(int)response.StatusCode} {response.ReasonPhrase} from {endpoint.Url}";
                logger.LogWarning(
                    "Failed to deliver event {EventId} (EventType: {EventType}, OrgId: {OrganizationId}) to endpoint {EndpointUrl} (EndpointId: {EndpointId}). Status: {StatusCode}, ReasonPhrase: {ReasonPhrase}",
                    outboundEvent.Id,
                    outboundEvent.EventType,
                    outboundEvent.OrganizationId,
                    endpoint.Url,
                    endpoint.Id,
                    (int)response.StatusCode,
                    response.ReasonPhrase);
                return new DeliveryResult(false, error);
            }
        }
        catch (HttpRequestException ex)
        {
            var error = $"HTTP error: {ex.Message}";
            logger.LogError(
                ex,
                "HTTP error delivering event {EventId} (EventType: {EventType}, OrgId: {OrganizationId}) to endpoint {EndpointUrl} (EndpointId: {EndpointId})",
                outboundEvent.Id,
                outboundEvent.EventType,
                outboundEvent.OrganizationId,
                endpoint.Url,
                endpoint.Id);
            return new DeliveryResult(false, error);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            // Request timeout (not application cancellation)
            var error = $"Request timeout to {endpoint.Url}";
            logger.LogWarning(
                ex,
                "Request timeout delivering event {EventId} (EventType: {EventType}, OrgId: {OrganizationId}) to endpoint {EndpointUrl} (EndpointId: {EndpointId})",
                outboundEvent.Id,
                outboundEvent.EventType,
                outboundEvent.OrganizationId,
                endpoint.Url,
                endpoint.Id);
            return new DeliveryResult(false, error);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(
                "Delivery of event {EventId} (EventType: {EventType}, OrgId: {OrganizationId}) to endpoint {EndpointUrl} (EndpointId: {EndpointId}) was cancelled",
                outboundEvent.Id,
                outboundEvent.EventType,
                outboundEvent.OrganizationId,
                endpoint.Url,
                endpoint.Id);
            return new DeliveryResult(false, "Operation cancelled");
        }
        catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
        {
            var error = $"Unexpected error: {ex.Message}";
            logger.LogError(
                ex,
                "Unexpected error delivering event {EventId} (EventType: {EventType}, OrgId: {OrganizationId}) to endpoint {EndpointUrl} (EndpointId: {EndpointId})",
                outboundEvent.Id,
                outboundEvent.EventType,
                outboundEvent.OrganizationId,
                endpoint.Url,
                endpoint.Id);
            return new DeliveryResult(false, error);
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

    private static string TruncateError(string error)
    {
        if (string.IsNullOrEmpty(error))
        {
            return error;
        }

        if (error.Length <= MaxErrorLength)
        {
            return error;
        }

        // Truncate and add suffix to indicate the error message was cut off
        const string truncationSuffix = "...";
        return error[..(MaxErrorLength - truncationSuffix.Length)] + truncationSuffix;
    }
}
