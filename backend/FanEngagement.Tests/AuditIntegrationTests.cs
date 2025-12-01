using System.Net.Http.Json;
using FanEngagement.Application.Audit;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class AuditIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public AuditIntegrationTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _output = output;
    }

    [Fact]
    public async Task AuditService_LogAsync_PersistsEventViaBackgroundService()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTimeOffset.UtcNow,
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            ResourceName = "Test Proposal",
            ActorUserId = Guid.NewGuid(),
            ActorDisplayName = "Test User",
            Outcome = AuditOutcome.Success
        };

        // Act - log event asynchronously
        await auditService.LogAsync(auditEvent);

        // Wait for background service to process by polling for the event
        var maxWaitTime = TimeSpan.FromSeconds(5);
        var pollInterval = TimeSpan.FromMilliseconds(100);
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        AuditEventDto? persistedEvent = null;
        
        var query = new AuditQuery
        {
            ResourceId = auditEvent.ResourceId,
            Page = 1,
            PageSize = 10
        };

        while (stopwatch.Elapsed < maxWaitTime && persistedEvent == null)
        {
            var result = await auditService.QueryAsync(query);
            persistedEvent = result.Items.FirstOrDefault(e => e.Id == auditEvent.Id);
            if (persistedEvent == null)
                await Task.Delay(pollInterval);
        }

        // Assert - verify event was persisted
        Assert.NotNull(persistedEvent);
        Assert.Equal(auditEvent.ActionType, persistedEvent.ActionType);
        Assert.Equal(auditEvent.ResourceType, persistedEvent.ResourceType);
        Assert.Equal(auditEvent.ResourceName, persistedEvent.ResourceName);
    }

    [Fact]
    public async Task AuditService_LogSyncAsync_PersistsEventImmediately()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTimeOffset.UtcNow,
            ActionType = AuditActionType.StatusChanged,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            ResourceName = "Critical Proposal",
            ActorUserId = Guid.NewGuid(),
            ActorDisplayName = "Admin User",
            Outcome = AuditOutcome.Success,
            Details = "{\"previousStatus\":\"Draft\",\"newStatus\":\"Open\"}"
        };

        // Act - log event synchronously
        await auditService.LogSyncAsync(auditEvent);

        // Assert - verify event was persisted immediately (no delay needed)
        var retrieved = await auditService.GetByIdAsync(auditEvent.Id);

        Assert.NotNull(retrieved);
        Assert.Equal(auditEvent.ActionType, retrieved.ActionType);
        Assert.Equal(auditEvent.ResourceType, retrieved.ResourceType);
        Assert.Equal(auditEvent.Details, retrieved.Details);
    }

    [Fact]
    public async Task AuditService_QueryAsync_WithFilters_ReturnsFilteredResults()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var orgId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        // Create multiple events
        var event1 = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTimeOffset.UtcNow,
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            OrganizationId = orgId,
            ActorUserId = userId,
            Outcome = AuditOutcome.Success
        };

        var event2 = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTimeOffset.UtcNow,
            ActionType = AuditActionType.Updated,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            OrganizationId = orgId,
            ActorUserId = Guid.NewGuid(), // Different user
            Outcome = AuditOutcome.Success
        };

        await auditService.LogSyncAsync(event1);
        await auditService.LogSyncAsync(event2);

        // Act - query by actor user ID
        var query = new AuditQuery
        {
            OrganizationId = orgId,
            ActorUserId = userId,
            Page = 1,
            PageSize = 10
        };

        var result = await auditService.QueryAsync(query);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.TotalCount >= 1);
        Assert.All(result.Items, item => Assert.Equal(userId, item.ActorUserId));
    }

    [Fact]
    public async Task AuditService_WithBuilder_CreatesCompleteEvent()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var userId = Guid.NewGuid();
        var resourceId = Guid.NewGuid();
        var orgId = Guid.NewGuid();

        var builder = new AuditEventBuilder()
            .WithActor(userId, "Test User")
            .WithIpAddress("192.168.1.1")
            .WithAction(AuditActionType.Created)
            .WithResource(AuditResourceType.ShareType, resourceId, "Common Stock")
            .WithOrganization(orgId, "Test Organization")
            .WithCorrelationId("test-correlation-123")
            .WithDetails(new { Symbol = "CS", VotingWeight = 1.0m })
            .AsSuccess();

        // Act
        await auditService.LogAsync(builder);

        // Wait for background processing using polling
        var maxWaitTime = TimeSpan.FromSeconds(5);
        var pollInterval = TimeSpan.FromMilliseconds(100);
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        AuditEventDto? persistedEvent = null;
        
        var query = new AuditQuery
        {
            ResourceId = resourceId,
            Page = 1,
            PageSize = 10
        };

        while (stopwatch.Elapsed < maxWaitTime && persistedEvent == null)
        {
            var result = await auditService.QueryAsync(query);
            persistedEvent = result.Items.FirstOrDefault(e => e.ResourceId == resourceId);
            if (persistedEvent == null)
                await Task.Delay(pollInterval);
        }

        // Assert
        Assert.NotNull(persistedEvent);
        Assert.Equal(userId, persistedEvent.ActorUserId);
        Assert.Equal("Test User", persistedEvent.ActorDisplayName);
        Assert.Equal("192.168.1.1", persistedEvent.ActorIpAddress);
        Assert.Equal(AuditActionType.Created, persistedEvent.ActionType);
        Assert.Equal(AuditResourceType.ShareType, persistedEvent.ResourceType);
        Assert.Equal("Common Stock", persistedEvent.ResourceName);
        Assert.Equal(orgId, persistedEvent.OrganizationId);
        Assert.Equal("Test Organization", persistedEvent.OrganizationName);
        Assert.Equal("test-correlation-123", persistedEvent.CorrelationId);
    }

    [Fact]
    public async Task AuditService_QueryAsync_WithDateRange_ReturnsEventsInRange()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var now = DateTimeOffset.UtcNow;
        var resourceId = Guid.NewGuid();

        // Create events with different timestamps
        var oldEvent = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = now.AddDays(-10),
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = resourceId,
            Outcome = AuditOutcome.Success
        };

        var recentEvent = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = now,
            ActionType = AuditActionType.Updated,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = resourceId,
            Outcome = AuditOutcome.Success
        };

        await auditService.LogSyncAsync(oldEvent);
        await auditService.LogSyncAsync(recentEvent);

        // Act - query for events in last 7 days
        var query = new AuditQuery
        {
            ResourceId = resourceId,
            FromDate = now.AddDays(-7),
            Page = 1,
            PageSize = 10
        };

        var result = await auditService.QueryAsync(query);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.TotalCount >= 1);
        Assert.All(result.Items, item => Assert.True(item.Timestamp >= now.AddDays(-7)));
        Assert.DoesNotContain(result.Items, item => item.Id == oldEvent.Id);
        Assert.Contains(result.Items, item => item.Id == recentEvent.Id);
    }

    [Fact]
    public async Task AuditService_QueryAsync_WithSearchText_FiltersResults()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var event1 = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTimeOffset.UtcNow,
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            ResourceName = "Budget Proposal",
            Outcome = AuditOutcome.Success
        };

        var event2 = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTimeOffset.UtcNow,
            ActionType = AuditActionType.Created,
            ResourceType = AuditResourceType.Proposal,
            ResourceId = Guid.NewGuid(),
            ResourceName = "Hiring Decision",
            Outcome = AuditOutcome.Success
        };

        await auditService.LogSyncAsync(event1);
        await auditService.LogSyncAsync(event2);

        // Act - search for "Budget"
        var query = new AuditQuery
        {
            SearchText = "Budget",
            Page = 1,
            PageSize = 10
        };

        var result = await auditService.QueryAsync(query);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.TotalCount >= 1);
        Assert.Contains(result.Items, item => item.ResourceName != null && item.ResourceName.Contains("Budget"));
    }
}
