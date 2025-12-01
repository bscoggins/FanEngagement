using System.Text.Json;
using System.Threading.Channels;
using FanEngagement.Domain.Entities;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.BackgroundServices;

/// <summary>
/// Background service that reads audit events from a channel and persists them to the database in batches.
/// Implements fallback file writing when database persistence fails.
/// </summary>
public class AuditPersistenceBackgroundService(
    Channel<AuditEvent> channel,
    IServiceScopeFactory serviceScopeFactory,
    ILogger<AuditPersistenceBackgroundService> logger) : BackgroundService
{
    private const int BatchSize = 100;
    private static readonly TimeSpan BatchInterval = TimeSpan.FromSeconds(1);
    private readonly string _fallbackDirectory = Path.Combine(Path.GetTempPath(), "fanengagement", "audit-fallback");

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
        var batch = new List<AuditEvent>(BatchSize);

        await foreach (var auditEvent in channel.Reader.ReadAllAsync(stoppingToken))
        {
            batch.Add(auditEvent);

            // Persist when batch is full or after timeout
            if (batch.Count >= BatchSize)
            {
                await PersistBatchAsync(batch, stoppingToken);
                batch.Clear();
            }
            else
            {
                // Check if more events are immediately available
                // If not, wait a short time and then persist partial batch
                await Task.Delay(BatchInterval, stoppingToken);
                if (batch.Count > 0)
                {
                    await PersistBatchAsync(batch, stoppingToken);
                    batch.Clear();
                }
            }
        }

        // Persist any remaining events when stopping
        if (batch.Count > 0)
        {
            await PersistBatchAsync(batch, stoppingToken);
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
                $"audit-fallback-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.json");

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

            foreach (var evt in events)
            {
                logger.LogWarning(
                    "Lost audit event: {ActionType} on {ResourceType}/{ResourceId} by {ActorUserId}",
                    evt.ActionType, evt.ResourceType, evt.ResourceId, evt.ActorUserId);
            }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation("Audit persistence background service is stopping gracefully");
        await base.StopAsync(cancellationToken);
    }
}
