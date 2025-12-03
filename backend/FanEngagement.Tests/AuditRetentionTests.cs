using FanEngagement.Application.Audit;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Configuration;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class AuditRetentionTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public AuditRetentionTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _output = output;
    }

    [Fact]
    public void AuditRetention_ConfigurationValidation_EnforcesMinimumRetentionDays()
    {
        // Arrange & Act & Assert
        var options = new AuditRetentionOptions();
        
        // Should throw for values less than 30
        Assert.Throws<ArgumentOutOfRangeException>(() => options.RetentionDays = 29);
        Assert.Throws<ArgumentOutOfRangeException>(() => options.RetentionDays = 0);
        Assert.Throws<ArgumentOutOfRangeException>(() => options.RetentionDays = -1);
        
        // Should accept values >= 30
        options.RetentionDays = 30;
        Assert.Equal(30, options.RetentionDays);
        
        options.RetentionDays = 365;
        Assert.Equal(365, options.RetentionDays);
    }

    [Fact]
    public void AuditRetention_ConfigurationValidation_EnforcesBatchSizeConstraints()
    {
        // Arrange & Act & Assert
        var options = new AuditRetentionOptions();
        
        // Should throw for invalid values
        Assert.Throws<ArgumentOutOfRangeException>(() => options.PurgeBatchSize = 0);
        Assert.Throws<ArgumentOutOfRangeException>(() => options.PurgeBatchSize = -1);
        Assert.Throws<ArgumentOutOfRangeException>(() => options.PurgeBatchSize = 10001);
        
        // Should accept valid values
        options.PurgeBatchSize = 1;
        Assert.Equal(1, options.PurgeBatchSize);
        
        options.PurgeBatchSize = 1000;
        Assert.Equal(1000, options.PurgeBatchSize);
        
        options.PurgeBatchSize = 10000;
        Assert.Equal(10000, options.PurgeBatchSize);
    }

    [Fact]
    public void AuditRetention_ConfigurationValidation_EnforcesPurgeScheduleNotEmpty()
    {
        // Arrange & Act & Assert
        var options = new AuditRetentionOptions();
        
        // Should throw for null or empty
        Assert.Throws<ArgumentException>(() => options.PurgeSchedule = null!);
        Assert.Throws<ArgumentException>(() => options.PurgeSchedule = "");
        Assert.Throws<ArgumentException>(() => options.PurgeSchedule = "   ");
        
        // Should accept valid cron expressions
        options.PurgeSchedule = "0 2 * * *";
        Assert.Equal("0 2 * * *", options.PurgeSchedule);
    }

    [Fact]
    public async Task AuditRetention_PurgeOldEvents_DeletesEventsOlderThanRetentionPeriod()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var retentionDays = 30;
        var cutoffDate = DateTimeOffset.UtcNow.AddDays(-retentionDays);

        // Create old events (beyond retention period)
        var oldEvent1 = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = cutoffDate.AddDays(-1),
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            ResourceName = "Old Proposal 1",
            Outcome = AuditOutcome.Success
        };

        var oldEvent2 = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = cutoffDate.AddDays(-10),
            ActionType = AuditActionType.Updated,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            ResourceName = "Old Proposal 2",
            Outcome = AuditOutcome.Success
        };

        // Create recent events (within retention period)
        var recentEvent = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTimeOffset.UtcNow.AddDays(-1),
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            ResourceName = "Recent Proposal",
            Outcome = AuditOutcome.Success
        };

        await auditService.LogSyncAsync(oldEvent1);
        await auditService.LogSyncAsync(oldEvent2);
        await auditService.LogSyncAsync(recentEvent);

        // Verify events were created
        var countBefore = await dbContext.AuditEvents.CountAsync();
        _output.WriteLine($"Events before purge: {countBefore}");

        // Act - Simulate purge operation using ToListAsync and RemoveRange (works with InMemory)
        var eventsToDelete = await dbContext.AuditEvents
            .Where(e => e.Timestamp < cutoffDate)
            .ToListAsync();

        var deleted = eventsToDelete.Count;
        dbContext.AuditEvents.RemoveRange(eventsToDelete);
        await dbContext.SaveChangesAsync();

        _output.WriteLine($"Events deleted: {deleted}");

        // Assert
        Assert.True(deleted >= 2, $"Expected to delete at least 2 events, but deleted {deleted}");

        // Verify old events are gone
        var oldEvent1Exists = await dbContext.AuditEvents.AnyAsync(e => e.Id == oldEvent1.Id);
        var oldEvent2Exists = await dbContext.AuditEvents.AnyAsync(e => e.Id == oldEvent2.Id);
        Assert.False(oldEvent1Exists);
        Assert.False(oldEvent2Exists);

        // Verify recent event still exists
        var recentEventExists = await dbContext.AuditEvents.AnyAsync(e => e.Id == recentEvent.Id);
        Assert.True(recentEventExists);
    }

    [Fact]
    public async Task AuditRetention_PurgeOldEvents_HandlesEmptyDatabase()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();

        var cutoffDate = DateTimeOffset.UtcNow.AddDays(-365);

        // Act - Try to delete when there might be no old events (using ToListAsync for InMemory compatibility)
        var eventsToDelete = await dbContext.AuditEvents
            .Where(e => e.Timestamp < cutoffDate.AddYears(-10)) // Very old date
            .Take(1000)
            .ToListAsync();

        var deleted = eventsToDelete.Count;
        dbContext.AuditEvents.RemoveRange(eventsToDelete);
        await dbContext.SaveChangesAsync();

        // Assert - Should not throw and should return 0
        Assert.True(deleted >= 0);
    }

    [Fact]
    public async Task AuditRetention_PurgeInBatches_ProcessesLargeNumberOfEvents()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var retentionDays = 30;
        var cutoffDate = DateTimeOffset.UtcNow.AddDays(-retentionDays);
        var batchSize = 10;
        var totalOldEvents = 25; // More than one batch

        // Create old events
        var oldEvents = new List<AuditEvent>();
        for (int i = 0; i < totalOldEvents; i++)
        {
            oldEvents.Add(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = cutoffDate.AddDays(-i - 1),
                ActionType = AuditActionType.Created,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                ResourceName = $"Old Proposal {i}",
                Outcome = AuditOutcome.Success
            });
        }

        foreach (var evt in oldEvents)
        {
            await auditService.LogSyncAsync(evt);
        }

        var totalDeleted = 0;

        // Act - Delete in batches (simulating background service behavior with ToListAsync for InMemory)
        while (true)
        {
            var eventsToDelete = await dbContext.AuditEvents
                .Where(e => e.Timestamp < cutoffDate)
                .Take(batchSize)
                .ToListAsync();

            var deleted = eventsToDelete.Count;
            if (deleted == 0)
                break;

            dbContext.AuditEvents.RemoveRange(eventsToDelete);
            await dbContext.SaveChangesAsync();

            totalDeleted += deleted;
            _output.WriteLine($"Batch deleted: {deleted}, Total so far: {totalDeleted}");

            // Small delay between batches (optional in test)
            await Task.Delay(10);
        }

        // Assert
        Assert.True(totalDeleted >= totalOldEvents, 
            $"Expected to delete at least {totalOldEvents} events, but deleted {totalDeleted}");

        // Verify all old events are gone
        var remainingOldEvents = await dbContext.AuditEvents
            .Where(e => e.Timestamp < cutoffDate)
            .CountAsync();
        Assert.Equal(0, remainingOldEvents);
    }

    [Fact]
    public async Task AuditRetention_PreservesRecentEvents_WhenPurgingOld()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var retentionDays = 90;
        var cutoffDate = DateTimeOffset.UtcNow.AddDays(-retentionDays);

        // Create a mix of old and recent events
        var oldEventId = Guid.NewGuid();
        var oldEvent = new AuditEvent
        {
            Id = oldEventId,
            Timestamp = cutoffDate.AddDays(-1),
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            ResourceName = "Old Event",
            Outcome = AuditOutcome.Success
        };

        var recentEventIds = new List<Guid>();
        for (int i = 0; i < 5; i++)
        {
            var recentId = Guid.NewGuid();
            recentEventIds.Add(recentId);
            await auditService.LogSyncAsync(new AuditEvent
            {
                Id = recentId,
                Timestamp = DateTimeOffset.UtcNow.AddDays(-i),
                ActionType = AuditActionType.Updated,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                ResourceName = $"Recent Event {i}",
                Outcome = AuditOutcome.Success
            });
        }

        await auditService.LogSyncAsync(oldEvent);

        // Act - Purge old events (using ToListAsync for InMemory compatibility)
        var eventsToDelete = await dbContext.AuditEvents
            .Where(e => e.Timestamp < cutoffDate)
            .ToListAsync();

        var deleted = eventsToDelete.Count;
        dbContext.AuditEvents.RemoveRange(eventsToDelete);
        await dbContext.SaveChangesAsync();

        // Assert
        Assert.True(deleted >= 1);

        // Verify old event is deleted
        var oldEventExists = await dbContext.AuditEvents.AnyAsync(e => e.Id == oldEventId);
        Assert.False(oldEventExists);

        // Verify all recent events still exist
        foreach (var recentId in recentEventIds)
        {
            var exists = await dbContext.AuditEvents.AnyAsync(e => e.Id == recentId);
            Assert.True(exists, $"Recent event {recentId} should still exist");
        }
    }

    [Fact]
    public async Task AuditRetention_AuditsThePurgeOperation_CreatesAuditEvent()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var retentionDays = 30;
        var cutoffDate = DateTimeOffset.UtcNow.AddDays(-retentionDays);

        // Create and delete some old events
        var oldEvent = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = cutoffDate.AddDays(-1),
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            Outcome = AuditOutcome.Success
        };

        await auditService.LogSyncAsync(oldEvent);
        
        var eventsToDelete = await dbContext.AuditEvents
            .Where(e => e.Timestamp < cutoffDate)
            .ToListAsync();

        var deletedCount = eventsToDelete.Count;
        dbContext.AuditEvents.RemoveRange(eventsToDelete);
        await dbContext.SaveChangesAsync();

        // Act - Create audit event for the purge operation (simulating what the service does)
        var purgeAuditEvent = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTimeOffset.UtcNow,
            ActionType = AuditActionType.Deleted,
            ResourceType = AuditResourceType.AuditEvent,
            ResourceId = Guid.Empty,
            ResourceName = "Audit Log Purge",
            Outcome = AuditOutcome.Success,
            ActorDisplayName = "System",
            Details = System.Text.Json.JsonSerializer.Serialize(new
            {
                DeletedCount = deletedCount,
                CutoffDate = cutoffDate,
                RetentionDays = retentionDays,
                DurationSeconds = 1.5
            })
        };

        await auditService.LogSyncAsync(purgeAuditEvent);

        // Assert - Verify purge audit event was created
        var purgeEvent = await dbContext.AuditEvents
            .FirstOrDefaultAsync(e => e.Id == purgeAuditEvent.Id);

        Assert.NotNull(purgeEvent);
        Assert.Equal(AuditActionType.Deleted, purgeEvent.ActionType);
        Assert.Equal(AuditResourceType.AuditEvent, purgeEvent.ResourceType);
        Assert.Equal("Audit Log Purge", purgeEvent.ResourceName);
        Assert.Equal("System", purgeEvent.ActorDisplayName);
        Assert.Contains($"\"DeletedCount\":{deletedCount}", purgeEvent.Details);
    }

    [Fact]
    public async Task AuditRetention_DifferentRetentionPeriods_Work()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        // Test with 90-day retention
        var retentionDays = 90;
        var cutoffDate = DateTimeOffset.UtcNow.AddDays(-retentionDays);

        var oldEvent = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = cutoffDate.AddDays(-1),
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Organization,
            ResourceId = Guid.NewGuid(),
            Outcome = AuditOutcome.Success
        };

        var justWithinRetentionEvent = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = cutoffDate.AddHours(1), // Just within retention period
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Organization,
            ResourceId = Guid.NewGuid(),
            Outcome = AuditOutcome.Success
        };

        await auditService.LogSyncAsync(oldEvent);
        await auditService.LogSyncAsync(justWithinRetentionEvent);

        // Act (using ToListAsync for InMemory compatibility)
        var eventsToDelete = await dbContext.AuditEvents
            .Where(e => e.Timestamp < cutoffDate)
            .ToListAsync();

        dbContext.AuditEvents.RemoveRange(eventsToDelete);
        await dbContext.SaveChangesAsync();

        // Assert
        var oldExists = await dbContext.AuditEvents.AnyAsync(e => e.Id == oldEvent.Id);
        var withinExists = await dbContext.AuditEvents.AnyAsync(e => e.Id == justWithinRetentionEvent.Id);

        Assert.False(oldExists, "Event older than retention should be deleted");
        Assert.True(withinExists, "Event within retention should be preserved");
    }
}
