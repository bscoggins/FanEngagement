using System.Diagnostics;
using System.Threading.Channels;
using FanEngagement.Application.Audit;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using FanEngagement.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Performance tests for the audit logging system.
/// Verifies that audit operations meet performance requirements at scale.
/// </summary>
public class AuditPerformanceTests
{
    private readonly ITestOutputHelper _output;
    
    // Test dataset sizes
    private const int LargeDatasetSize = 100000;
    private const int MediumDatasetSize = 50000;
    private const int SmallDatasetSize = 10000;
    
    // Batch processing configuration
    private const int BatchInsertSize = 1000;

    public AuditPerformanceTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task QueryWithLargeDataset_ReturnsWithinThreshold()
    {
        // Arrange - Create service with 100K+ events
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);

        var orgId = Guid.NewGuid();
        var testUserId = Guid.NewGuid();

        // Seed large dataset of audit events
        _output.WriteLine($"Seeding {LargeDatasetSize:N0} audit events...");
        var seedStopwatch = Stopwatch.StartNew();
        
        var events = new List<AuditEvent>();
        for (int i = 0; i < LargeDatasetSize; i++)
        {
            events.Add(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow.AddMinutes(-i),
                ActionType = (AuditActionType)(i % 10), // Vary action types
                ResourceType = (AuditResourceType)(i % 8), // Vary resource types
                ResourceId = Guid.NewGuid(),
                OrganizationId = i % 3 == 0 ? orgId : Guid.NewGuid(), // 1/3 in test org
                ActorUserId = i % 5 == 0 ? testUserId : Guid.NewGuid(), // 1/5 by test user
                Outcome = AuditOutcome.Success
            });

            // Batch insert for performance
            if (events.Count >= BatchInsertSize)
            {
                dbContext.AuditEvents.AddRange(events);
                await dbContext.SaveChangesAsync();
                events.Clear();
            }
        }

        // Insert remaining events
        if (events.Count > 0)
        {
            dbContext.AuditEvents.AddRange(events);
            await dbContext.SaveChangesAsync();
        }

        seedStopwatch.Stop();
        _output.WriteLine($"Seeding completed in {seedStopwatch.ElapsedMilliseconds}ms");

        var service = new AuditService(channel, dbContext, NullLogger<AuditService>.Instance);

        var query = new AuditQuery
        {
            OrganizationId = orgId,
            Page = 1,
            PageSize = 50
        };

        // Act - Query and measure time
        var stopwatch = Stopwatch.StartNew();
        var result = await service.QueryAsync(query);
        stopwatch.Stop();

        // Assert - Should complete within 500ms threshold
        _output.WriteLine($"Query completed in {stopwatch.ElapsedMilliseconds}ms");
        _output.WriteLine($"Found {result.TotalCount} events, returned {result.Items.Count} items");

        Assert.True(stopwatch.ElapsedMilliseconds < 500,
            $"Query took {stopwatch.ElapsedMilliseconds}ms, expected <500ms");
        Assert.True(result.TotalCount > 0);
        Assert.Equal(50, result.Items.Count);
    }

    [Fact]
    public async Task LogEvent_Overhead_WithinThreshold()
    {
        // Arrange
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);
        var service = new AuditService(channel, dbContext, NullLogger<AuditService>.Instance);

        // Warm up
        await service.LogAsync(CreateTestAuditEvent());

        // Act - Log 100 events and measure average time
        var stopwatch = Stopwatch.StartNew();
        var iterations = 100;

        for (int i = 0; i < iterations; i++)
        {
            await service.LogAsync(CreateTestAuditEvent());
        }

        stopwatch.Stop();

        // Assert - Average should be <10ms per event
        var averageMs = (double)stopwatch.ElapsedMilliseconds / iterations;
        _output.WriteLine($"Average LogAsync time: {averageMs:F2}ms per event ({stopwatch.ElapsedMilliseconds}ms total for {iterations} events)");

        Assert.True(averageMs < 10,
            $"Average LogAsync took {averageMs:F2}ms per event, expected <10ms");
    }

    [Fact]
    public async Task ConcurrentLogging_HandlesLoad()
    {
        // Arrange
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);
        var service = new AuditService(channel, dbContext, NullLogger<AuditService>.Instance);

        // Act - Simulate 100 concurrent writes
        var concurrentTasks = 100;
        var stopwatch = Stopwatch.StartNew();

        var tasks = Enumerable.Range(0, concurrentTasks)
            .Select(async i =>
            {
                var auditEvent = new AuditEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = DateTimeOffset.UtcNow,
                    ActionType = AuditActionType.Created,
                    ResourceType = AuditResourceType.Proposal,
                    ResourceId = Guid.NewGuid(),
                    Outcome = AuditOutcome.Success
                };
                await service.LogAsync(auditEvent);
            })
            .ToList();

        await Task.WhenAll(tasks);
        stopwatch.Stop();

        // Assert - All tasks should complete successfully
        _output.WriteLine($"100 concurrent LogAsync calls completed in {stopwatch.ElapsedMilliseconds}ms");
        _output.WriteLine($"Average: {(double)stopwatch.ElapsedMilliseconds / concurrentTasks:F2}ms per event");

        // Verify all events were queued (channel should have 100 items)
        var queuedCount = 0;
        while (channel.Reader.TryRead(out _))
        {
            queuedCount++;
        }

        Assert.Equal(concurrentTasks, queuedCount);
    }

    [Fact]
    public async Task QueryWithComplexFilters_PerformsWell()
    {
        // Arrange - Create service with medium dataset
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);

        var orgId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        // Seed medium dataset with varied attributes
        _output.WriteLine($"Seeding {MediumDatasetSize:N0} audit events...");
        var events = new List<AuditEvent>();
        for (int i = 0; i < MediumDatasetSize; i++)
        {
            events.Add(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow.AddDays(-i % 365), // Spread across a year
                ActionType = (AuditActionType)(i % 10),
                ResourceType = (AuditResourceType)(i % 8),
                ResourceId = Guid.NewGuid(),
                OrganizationId = i % 2 == 0 ? orgId : Guid.NewGuid(),
                ActorUserId = i % 4 == 0 ? userId : Guid.NewGuid(),
                Outcome = i % 10 == 0 ? AuditOutcome.Failure : AuditOutcome.Success
            });

            if (events.Count >= BatchInsertSize)
            {
                dbContext.AuditEvents.AddRange(events);
                await dbContext.SaveChangesAsync();
                events.Clear();
            }
        }

        if (events.Count > 0)
        {
            dbContext.AuditEvents.AddRange(events);
            await dbContext.SaveChangesAsync();
        }

        var service = new AuditService(channel, dbContext, NullLogger<AuditService>.Instance);

        // Act - Complex query with multiple filters
        var query = new AuditQuery
        {
            OrganizationId = orgId,
            ActorUserId = userId,
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            Outcome = AuditOutcome.Success,
            FromDate = DateTimeOffset.UtcNow.AddDays(-180),
            ToDate = DateTimeOffset.UtcNow,
            Page = 1,
            PageSize = 25
        };

        var stopwatch = Stopwatch.StartNew();
        var result = await service.QueryAsync(query);
        stopwatch.Stop();

        // Assert - Should complete quickly even with multiple filters
        _output.WriteLine($"Complex query completed in {stopwatch.ElapsedMilliseconds}ms");
        _output.WriteLine($"Found {result.TotalCount} matching events");

        const int ComplexQueryThresholdMs = 1000;
        Assert.True(stopwatch.ElapsedMilliseconds < ComplexQueryThresholdMs,
            $"Complex query took {stopwatch.ElapsedMilliseconds}ms, expected <{ComplexQueryThresholdMs}ms");
    }

    [Fact]
    public async Task PaginationThroughLargeDataset_MaintainsPerformance()
    {
        // Arrange - Create service with small dataset
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);

        var orgId = Guid.NewGuid();

        // Seed small dataset
        _output.WriteLine($"Seeding {SmallDatasetSize:N0} audit events...");
        var events = new List<AuditEvent>();
        for (int i = 0; i < SmallDatasetSize; i++)
        {
            events.Add(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow.AddMinutes(-i),
                ActionType = AuditActionType.Created,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                OrganizationId = orgId,
                Outcome = AuditOutcome.Success
            });

            if (events.Count >= BatchInsertSize)
            {
                dbContext.AuditEvents.AddRange(events);
                await dbContext.SaveChangesAsync();
                events.Clear();
            }
        }

        if (events.Count > 0)
        {
            dbContext.AuditEvents.AddRange(events);
            await dbContext.SaveChangesAsync();
        }

        var service = new AuditService(channel, dbContext, NullLogger<AuditService>.Instance);

        // Act - Page through first 10 pages (500 records)
        var timings = new List<long>();
        for (int page = 1; page <= 10; page++)
        {
            var query = new AuditQuery
            {
                OrganizationId = orgId,
                Page = page,
                PageSize = 50
            };

            var stopwatch = Stopwatch.StartNew();
            var result = await service.QueryAsync(query);
            stopwatch.Stop();

            timings.Add(stopwatch.ElapsedMilliseconds);
            _output.WriteLine($"Page {page} completed in {stopwatch.ElapsedMilliseconds}ms");

            Assert.Equal(50, result.Items.Count);
        }

        // Assert - All pages should be within threshold and consistent
        var maxTiming = timings.Max();
        var avgTiming = timings.Average();

        _output.WriteLine($"Average page load: {avgTiming:F2}ms, Max: {maxTiming}ms");

        Assert.True(maxTiming < 500,
            $"Slowest page took {maxTiming}ms, expected <500ms");
        Assert.True(avgTiming < 250,
            $"Average page load took {avgTiming:F2}ms, expected <250ms");
    }

    [Fact]
    public async Task LogSyncAsync_PerformanceImpact()
    {
        // Arrange
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);
        var service = new AuditService(channel, dbContext, NullLogger<AuditService>.Instance);

        // Act - Measure synchronous logging (which persists immediately)
        var iterations = 50; // Fewer iterations since this is synchronous
        var stopwatch = Stopwatch.StartNew();

        for (int i = 0; i < iterations; i++)
        {
            await service.LogSyncAsync(CreateTestAuditEvent());
        }

        stopwatch.Stop();

        // Assert - LogSyncAsync is slower but should still be reasonable
        var averageMs = (double)stopwatch.ElapsedMilliseconds / iterations;
        _output.WriteLine($"Average LogSyncAsync time: {averageMs:F2}ms per event ({stopwatch.ElapsedMilliseconds}ms total for {iterations} events)");

        // LogSyncAsync includes database write, so we allow more time
        Assert.True(averageMs < 100,
            $"Average LogSyncAsync took {averageMs:F2}ms per event, expected <100ms");

        // Verify all events were persisted
        var persistedCount = await dbContext.AuditEvents.CountAsync();
        Assert.Equal(iterations, persistedCount);
    }

    private static AuditEvent CreateTestAuditEvent()
    {
        return new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTimeOffset.UtcNow,
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            Outcome = AuditOutcome.Success
        };
    }
}
