using System.Text.Json;
using System.Threading.Channels;
using FanEngagement.Domain.Entities;
using FanEngagement.Infrastructure.Configuration;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FanEngagement.Infrastructure.BackgroundServices;

/// <summary>
/// Background service that reads audit events from a channel and persists them to the database in batches.
/// Implements fallback file writing when database persistence fails.
/// </summary>
public class AuditPersistenceBackgroundService(
    Channel<AuditEvent> channel,
    IServiceScopeFactory serviceScopeFactory,
    IOptions<AuditOptions> options,
    ILogger<AuditPersistenceBackgroundService> logger) : BackgroundService
{
    private readonly AuditOptions _options = options.Value;
    private readonly int _batchSize = options.Value.BatchSize;
    private readonly TimeSpan _batchInterval = TimeSpan.FromMilliseconds(options.Value.BatchIntervalMs);
    private readonly string _fallbackDirectory = options.Value.FallbackDirectory 
        ?? Path.Combine(Path.GetTempPath(), "fanengagement", "audit-fallback");

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Audit persistence background service started");

        try
        {
            await ProcessEventsAsync(stoppingToken);
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Audit persistence background service is stopping");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Audit persistence background service encountered an error");
        }
    }

    private async Task ProcessEventsAsync(CancellationToken stoppingToken)
    {
        var batch = new List<AuditEvent>(_batchSize);

        while (!stoppingToken.IsCancellationRequested)
        {
            // Try to read an event with timeout
            if (await channel.Reader.WaitToReadAsync(stoppingToken))
            {
                // Read available events up to batch size
                while (batch.Count < _batchSize && channel.Reader.TryRead(out var auditEvent))
                {
                    batch.Add(auditEvent);
                }

                // If batch is full, persist immediately
                if (batch.Count >= _batchSize)
                {
                    await PersistBatchAsync(batch, stoppingToken);
                    batch.Clear();
                }
                else
                {
                    // Wait for more events or timeout
                    // Use try-catch to handle cancellation gracefully during delay
                    try
                    {
                        await Task.Delay(_batchInterval, stoppingToken);
                    }
                    catch (OperationCanceledException)
                    {
                        // Cancellation during delay - persist the batch and exit
                        if (batch.Count > 0)
                        {
                            await PersistBatchAsync(batch, CancellationToken.None);
                            batch.Clear();
                        }
                        break;
                    }
                    
                    // Read any additional events that arrived during the delay
                    while (batch.Count < _batchSize && channel.Reader.TryRead(out var auditEvent))
                    {
                        batch.Add(auditEvent);
                    }

                    // Persist the accumulated batch if we have any events
                    if (batch.Count > 0)
                    {
                        await PersistBatchAsync(batch, stoppingToken);
                        batch.Clear();
                    }
                }
            }
        }

        // Persist any remaining events when stopping
        if (batch.Count > 0)
        {
            await PersistBatchAsync(batch, CancellationToken.None);
        }
    }

    private async Task PersistBatchAsync(List<AuditEvent> batch, CancellationToken stoppingToken)
    {
        try
        {
            using var scope = serviceScopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();

            dbContext.AuditEvents.AddRange(batch);
            await dbContext.SaveChangesAsync(stoppingToken);

            logger.LogDebug("Persisted {Count} audit events", batch.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to persist {Count} audit events to database", batch.Count);

            // Fallback: Write to file
            await WriteFallbackAsync(batch);
        }
    }

    private async Task WriteFallbackAsync(List<AuditEvent> events)
    {
        try
        {
            var filename = Path.Combine(
                _fallbackDirectory,
                $"audit-fallback-{DateTimeOffset.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.json");

            Directory.CreateDirectory(_fallbackDirectory);

            var json = JsonSerializer.Serialize(events, JsonOptions);
            await File.WriteAllTextAsync(filename, json);

            logger.LogWarning(
                "Wrote {Count} audit events to fallback file: {Filename}",
                events.Count, filename);
        }
        catch (Exception ex)
        {
            // Last resort: Log event data to application logs
            logger.LogCritical(ex,
                "Failed to write audit fallback file. {Count} events may be lost.",
                events.Count);

            // Log a sample of the lost events (up to 5) to avoid excessive logging
            var samplesToLog = Math.Min(5, events.Count);
            for (int i = 0; i < samplesToLog; i++)
            {
                var evt = events[i];
                logger.LogWarning(
                    "Lost audit event: {ActionType} on {ResourceType}/{ResourceId} by {ActorUserId}",
                    evt.ActionType, evt.ResourceType, evt.ResourceId, evt.ActorUserId);
            }
            
            if (events.Count > samplesToLog)
            {
                logger.LogWarning(
                    "...and {AdditionalCount} more audit events were lost",
                    events.Count - samplesToLog);
            }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation("Audit persistence background service is stopping gracefully");
        await base.StopAsync(cancellationToken);
    }
}
