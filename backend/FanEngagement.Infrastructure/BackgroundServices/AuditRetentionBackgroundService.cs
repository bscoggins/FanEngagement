using FanEngagement.Application.Audit;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Configuration;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FanEngagement.Infrastructure.BackgroundServices;

/// <summary>
/// Background service that automatically purges old audit events based on retention policy.
/// Runs on a configurable schedule (default: daily at 2 AM UTC) and deletes events in batches.
/// </summary>
public class AuditRetentionBackgroundService(
    IServiceProvider serviceProvider,
    IOptions<AuditRetentionOptions> options,
    ILogger<AuditRetentionBackgroundService> logger) : BackgroundService
{
    private readonly AuditRetentionOptions _options = options.Value;
    private DateTime _lastPurgeDate = DateTime.MinValue;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "AuditRetentionBackgroundService started (retention: {RetentionDays} days, schedule: {Schedule}, batch size: {BatchSize})",
            _options.RetentionDays,
            _options.PurgeSchedule,
            _options.PurgeBatchSize);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (IsPurgeTime())
                {
                    await PurgeOldEventsAsync(stoppingToken);
                    _lastPurgeDate = DateTime.UtcNow.Date;
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
            {
                logger.LogError(ex, "Error during audit retention purge");
            }

            try
            {
                // Check every hour whether it's time to purge
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        logger.LogInformation("AuditRetentionBackgroundService stopped");
    }

    /// <summary>
    /// Determines if it's time to run the purge operation based on the cron schedule.
    /// </summary>
    private bool IsPurgeTime()
    {
        var now = DateTime.UtcNow;
        
        // Don't run more than once per day
        if (_lastPurgeDate.Date == now.Date)
        {
            return false;
        }

        // Parse cron schedule (format: "minute hour day-of-month month day-of-week")
        var parts = _options.PurgeSchedule.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 5)
        {
            logger.LogWarning("Invalid cron schedule format: {Schedule}. Expected 5 fields.", _options.PurgeSchedule);
            return false;
        }

        // For simplicity, we only support basic patterns for hour and minute
        // Day/month/dow support can be added later if needed
        
        // Warn if day/month/dow fields are not wildcards (they will be ignored)
        if (parts[2] != "*" || parts[3] != "*" || parts[4] != "*")
        {
            logger.LogWarning(
                "Day-of-month, month, and day-of-week fields in cron schedule are not supported and will be ignored. " +
                "Only minute and hour fields are used. Schedule: {Schedule}",
                _options.PurgeSchedule);
        }
        
        if (!int.TryParse(parts[0], out var scheduleMinute) || scheduleMinute < 0 || scheduleMinute > 59)
        {
            if (parts[0] != "*")
            {
                logger.LogWarning("Invalid minute in cron schedule: {Minute}", parts[0]);
                return false;
            }
            scheduleMinute = -1; // Wildcard
        }

        if (!int.TryParse(parts[1], out var scheduleHour) || scheduleHour < 0 || scheduleHour > 23)
        {
            if (parts[1] != "*")
            {
                logger.LogWarning("Invalid hour in cron schedule: {Hour}", parts[1]);
                return false;
            }
            scheduleHour = -1; // Wildcard
        }

        // Check if current time matches the schedule
        // Since we check hourly, we allow a window: the minute must be within 5 minutes of scheduled time
        var hourMatches = scheduleHour == -1 || now.Hour == scheduleHour;
        var minuteMatches = scheduleMinute == -1 ||
            ((now.Minute - scheduleMinute + 60) % 60 < 5);

        return hourMatches && minuteMatches;
    }

    /// <summary>
    /// Purges audit events older than the retention period.
    /// Deletes in batches to avoid locking the database.
    /// </summary>
    private async Task PurgeOldEventsAsync(CancellationToken cancellationToken)
    {
        var startTime = DateTimeOffset.UtcNow;
        var cutoffDate = DateTimeOffset.UtcNow.AddDays(-_options.RetentionDays);
        var totalDeleted = 0;

        logger.LogInformation(
            "Starting audit event purge for events older than {CutoffDate} ({RetentionDays} days)",
            cutoffDate,
            _options.RetentionDays);

        try
        {
            using var scope = serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();

            // Process in batches to avoid locking
            while (!cancellationToken.IsCancellationRequested)
            {
                var deleted = await dbContext.AuditEvents
                    .Where(e => e.Timestamp < cutoffDate)
                    .Take(_options.PurgeBatchSize)
                    .ExecuteDeleteAsync(cancellationToken);

                if (deleted == 0)
                {
                    break;
                }

                totalDeleted += deleted;

                logger.LogDebug(
                    "Purged batch of {BatchSize} audit events (total: {TotalDeleted})",
                    deleted,
                    totalDeleted);

                // Small delay between batches to reduce database load
                if (!cancellationToken.IsCancellationRequested)
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(100), cancellationToken);
                }
            }

            var duration = DateTimeOffset.UtcNow - startTime;

            logger.LogInformation(
                "Completed audit event purge: deleted {TotalDeleted} events in {Duration:F2} seconds",
                totalDeleted,
                duration.TotalSeconds);

            // Audit the purge operation itself
            await AuditPurgeOperationAsync(scope, totalDeleted, cutoffDate, duration, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Failed to complete audit event purge after deleting {TotalDeleted} events",
                totalDeleted);
            throw;
        }
    }

    /// <summary>
    /// Creates an audit event for the purge operation itself.
    /// </summary>
    private async Task AuditPurgeOperationAsync(
        IServiceScope scope,
        int deletedCount,
        DateTimeOffset cutoffDate,
        TimeSpan duration,
        CancellationToken cancellationToken)
    {
        try
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

            var purgeEvent = new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow,
                ActionType = AuditActionType.Deleted,
                ResourceType = AuditResourceType.AuditEvent,
                ResourceId = Guid.Empty, // No specific resource ID for bulk operation
                ResourceName = "Audit Log Purge",
                Outcome = AuditOutcome.Success,
                ActorDisplayName = "System",
                Details = System.Text.Json.JsonSerializer.Serialize(new
                {
                    DeletedCount = deletedCount,
                    CutoffDate = cutoffDate,
                    RetentionDays = _options.RetentionDays,
                    DurationSeconds = duration.TotalSeconds
                })
            };

            await auditService.LogAsync(purgeEvent, cancellationToken);

            logger.LogDebug("Audit event created for purge operation");
        }
        catch (Exception ex)
        {
            // Don't fail the purge if we can't audit it
            logger.LogWarning(ex, "Failed to create audit event for purge operation");
        }
    }
}
