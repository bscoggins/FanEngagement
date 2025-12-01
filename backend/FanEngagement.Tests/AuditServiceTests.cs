using System.Threading.Channels;
using FanEngagement.Application.Audit;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using FanEngagement.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace FanEngagement.Tests;

public class AuditServiceTests
{
    private readonly ILogger<AuditService> _logger;

    public AuditServiceTests()
    {
        _logger = NullLogger<AuditService>.Instance;
    }

    [Fact]
    public async Task LogAsync_WithEvent_QueuesEventToChannel()
    {
        // Arrange
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);
        var service = new AuditService(channel, dbContext, _logger);

        var auditEvent = CreateTestAuditEvent();

        // Act
        await service.LogAsync(auditEvent);

        // Assert
        Assert.True(channel.Reader.TryRead(out var queued));
        Assert.Equal(auditEvent.Id, queued.Id);
        Assert.Equal(auditEvent.ActionType, queued.ActionType);
        Assert.Equal(auditEvent.ResourceType, queued.ResourceType);
    }

    [Fact]
    public async Task LogAsync_WithBuilder_BuildsAndQueuesEvent()
    {
        // Arrange
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);
        var service = new AuditService(channel, dbContext, _logger);

        var builder = new AuditEventBuilder()
            .WithAction(AuditActionType.Created)
            .WithResource(AuditResourceType.Proposal, Guid.NewGuid(), "Test");

        // Act
        await service.LogAsync(builder);

        // Assert
        Assert.True(channel.Reader.TryRead(out var queued));
        Assert.Equal(AuditActionType.Created, queued.ActionType);
        Assert.Equal(AuditResourceType.Proposal, queued.ResourceType);
    }

    [Fact]
    public async Task LogAsync_WhenChannelFull_DoesNotThrow()
    {
        // Arrange
        var channel = Channel.CreateBounded<AuditEvent>(new BoundedChannelOptions(1)
        {
            FullMode = BoundedChannelFullMode.DropOldest
        });
        channel.Writer.TryWrite(CreateTestAuditEvent()); // Fill channel

        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);
        var service = new AuditService(channel, dbContext, _logger);

        // Act & Assert - should not throw
        var exception = await Record.ExceptionAsync(async () =>
            await service.LogAsync(CreateTestAuditEvent()));

        Assert.Null(exception);
    }

    [Fact]
    public async Task LogSyncAsync_PersistsEventImmediately()
    {
        // Arrange
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);
        var service = new AuditService(channel, dbContext, _logger);

        var auditEvent = CreateTestAuditEvent();

        // Act
        await service.LogSyncAsync(auditEvent);

        // Assert
        var persisted = await dbContext.AuditEvents.FirstOrDefaultAsync(e => e.Id == auditEvent.Id);
        Assert.NotNull(persisted);
        Assert.Equal(auditEvent.ActionType, persisted.ActionType);
    }

    [Fact]
    public async Task LogSyncAsync_WhenDatabaseFails_DoesNotThrow()
    {
        // Arrange - use a disposed context to simulate database failure
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);
        dbContext.Dispose(); // Dispose to simulate failure

        var service = new AuditService(channel, dbContext, _logger);
        var auditEvent = CreateTestAuditEvent();

        // Act & Assert - should not throw
        var exception = await Record.ExceptionAsync(async () =>
            await service.LogSyncAsync(auditEvent));

        Assert.Null(exception);
    }

    [Fact]
    public async Task QueryAsync_WithFilters_ReturnsFilteredResults()
    {
        // Arrange
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);

        var orgId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        // Add test events
        dbContext.AuditEvents.AddRange(
            new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow,
                ActionType = AuditActionType.Created,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                OrganizationId = orgId,
                ActorUserId = userId,
                Outcome = AuditOutcome.Success
            },
            new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow,
                ActionType = AuditActionType.Updated,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                OrganizationId = orgId,
                ActorUserId = Guid.NewGuid(), // Different user
                Outcome = AuditOutcome.Success
            }
        );
        await dbContext.SaveChangesAsync();

        var service = new AuditService(channel, dbContext, _logger);

        var query = new AuditQuery
        {
            OrganizationId = orgId,
            ActorUserId = userId,
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await service.QueryAsync(query);

        // Assert
        Assert.Equal(1, result.TotalCount);
        Assert.Single(result.Items);
        Assert.Equal(userId, result.Items[0].ActorUserId);
    }

    [Fact]
    public async Task QueryAsync_WithPagination_ReturnsPaginatedResults()
    {
        // Arrange
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);

        // Add 5 test events
        for (int i = 0; i < 5; i++)
        {
            dbContext.AuditEvents.Add(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow.AddMinutes(-i),
                ActionType = AuditActionType.Created,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                Outcome = AuditOutcome.Success
            });
        }
        await dbContext.SaveChangesAsync();

        var service = new AuditService(channel, dbContext, _logger);

        var query = new AuditQuery
        {
            Page = 1,
            PageSize = 2
        };

        // Act
        var result = await service.QueryAsync(query);

        // Assert
        Assert.Equal(5, result.TotalCount);
        Assert.Equal(2, result.Items.Count);
        Assert.Equal(3, result.TotalPages);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsEventWithDetails()
    {
        // Arrange
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);

        var eventId = Guid.NewGuid();
        var auditEvent = new AuditEvent
        {
            Id = eventId,
            Timestamp = DateTimeOffset.UtcNow,
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            Details = "{\"key\":\"value\"}",
            Outcome = AuditOutcome.Success
        };
        dbContext.AuditEvents.Add(auditEvent);
        await dbContext.SaveChangesAsync();

        var service = new AuditService(channel, dbContext, _logger);

        // Act
        var result = await service.GetByIdAsync(eventId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(eventId, result.Id);
        Assert.Equal("{\"key\":\"value\"}", result.Details);
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotFound_ReturnsNull()
    {
        // Arrange
        var channel = Channel.CreateUnbounded<AuditEvent>();
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var dbContext = new FanEngagementDbContext(options);
        var service = new AuditService(channel, dbContext, _logger);

        // Act
        var result = await service.GetByIdAsync(Guid.NewGuid());

        // Assert
        Assert.Null(result);
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
