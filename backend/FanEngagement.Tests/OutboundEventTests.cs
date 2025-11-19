using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.OutboundEvents;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class OutboundEventTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public OutboundEventTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _client = factory.CreateClient();
        _factory = factory;
        _output = output;
    }

    [Fact]
    public async Task GetAllOutboundEvents_ReturnsEmptyList_WhenNoEvents()
    {
        // Arrange
        var org = await CreateOrganizationAsync();

        // Act
        var response = await _client.GetAsync($"/organizations/{org.Id}/outbound-events");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = await response.Content.ReadFromJsonAsync<List<OutboundEventDto>>();
        Assert.NotNull(events);
        Assert.Empty(events!);
    }

    [Fact]
    public async Task GetAllOutboundEvents_ReturnsEvents_ForOrganization()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        await EnqueueEventAsync(org.Id, "ProposalCreated", "{\"proposalId\":\"123\"}");
        await EnqueueEventAsync(org.Id, "ProposalFinalized", "{\"proposalId\":\"456\"}");

        // Act
        var response = await _client.GetAsync($"/organizations/{org.Id}/outbound-events");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = await response.Content.ReadFromJsonAsync<List<OutboundEventDto>>();
        Assert.NotNull(events);
        Assert.Equal(2, events!.Count);
    }

    [Fact]
    public async Task GetAllOutboundEvents_FiltersByStatus_WhenProvided()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var event1Id = await EnqueueEventAsync(org.Id, "ProposalCreated", "{\"proposalId\":\"123\"}");
        await EnqueueEventAsync(org.Id, "ProposalFinalized", "{\"proposalId\":\"456\"}");
        
        // Mark one as delivered
        await MarkEventAsDeliveredAsync(event1Id);

        // Act
        var response = await _client.GetAsync($"/organizations/{org.Id}/outbound-events?status={OutboundEventStatus.Pending}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = await response.Content.ReadFromJsonAsync<List<OutboundEventDto>>();
        Assert.NotNull(events);
        Assert.Single(events!);
        Assert.Equal(OutboundEventStatus.Pending, events[0].Status);
    }

    [Fact]
    public async Task GetAllOutboundEvents_FiltersByEventType_WhenProvided()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        await EnqueueEventAsync(org.Id, "ProposalCreated", "{\"proposalId\":\"123\"}");
        await EnqueueEventAsync(org.Id, "ProposalFinalized", "{\"proposalId\":\"456\"}");

        // Act
        var response = await _client.GetAsync($"/organizations/{org.Id}/outbound-events?eventType=ProposalCreated");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = await response.Content.ReadFromJsonAsync<List<OutboundEventDto>>();
        Assert.NotNull(events);
        Assert.Single(events!);
        Assert.Equal("ProposalCreated", events[0].EventType);
    }

    [Fact]
    public async Task GetOutboundEventById_ReturnsEvent_WhenExists()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var eventId = await EnqueueEventAsync(org.Id, "ProposalCreated", "{\"proposalId\":\"123\"}");

        // Act
        var response = await _client.GetAsync($"/organizations/{org.Id}/outbound-events/{eventId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<OutboundEventDetailsDto>();
        Assert.NotNull(result);
        Assert.Equal(eventId, result!.Id);
        Assert.Equal("ProposalCreated", result.EventType);
        Assert.Equal("{\"proposalId\":\"123\"}", result.Payload);
        Assert.Equal(OutboundEventStatus.Pending, result.Status);
    }

    [Fact]
    public async Task GetOutboundEventById_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange
        var org = await CreateOrganizationAsync();

        // Act
        var response = await _client.GetAsync($"/organizations/{org.Id}/outbound-events/{Guid.NewGuid()}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RetryOutboundEvent_ReturnsNoContent_WhenEventIsFailed()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var eventId = await EnqueueEventAsync(org.Id, "ProposalCreated", "{\"proposalId\":\"123\"}");
        await MarkEventAsFailedAsync(eventId);

        // Act
        var response = await _client.PostAsync($"/organizations/{org.Id}/outbound-events/{eventId}/retry", null);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verify status changed to Pending
        var getResponse = await _client.GetAsync($"/organizations/{org.Id}/outbound-events/{eventId}");
        var result = await getResponse.Content.ReadFromJsonAsync<OutboundEventDetailsDto>();
        Assert.NotNull(result);
        Assert.Equal(OutboundEventStatus.Pending, result!.Status);
    }

    [Fact]
    public async Task RetryOutboundEvent_ReturnsNotFound_WhenEventIsNotFailed()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var eventId = await EnqueueEventAsync(org.Id, "ProposalCreated", "{\"proposalId\":\"123\"}");

        // Act (event is Pending, not Failed)
        var response = await _client.PostAsync($"/organizations/{org.Id}/outbound-events/{eventId}/retry", null);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task RetryOutboundEvent_ReturnsNotFound_WhenEventDoesNotExist()
    {
        // Arrange
        var org = await CreateOrganizationAsync();

        // Act
        var response = await _client.PostAsync($"/organizations/{org.Id}/outbound-events/{Guid.NewGuid()}/retry", null);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private async Task<Organization> CreateOrganizationAsync()
    {
        var createOrgResponse = await _client.PostAsJsonAsync("/organizations",
            new CreateOrganizationRequest { Name = "Test Organization" });
        Assert.Equal(HttpStatusCode.Created, createOrgResponse.StatusCode);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);
        return org!;
    }

    private async Task<Guid> EnqueueEventAsync(Guid organizationId, string eventType, string payload)
    {
        using var scope = _factory.Services.CreateScope();
        var outboundEventService = scope.ServiceProvider.GetRequiredService<IOutboundEventService>();
        return await outboundEventService.EnqueueEventAsync(organizationId, eventType, payload);
    }

    private async Task MarkEventAsDeliveredAsync(Guid eventId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var evt = await dbContext.OutboundEvents.FindAsync(eventId);
        if (evt != null)
        {
            evt.Status = OutboundEventStatus.Delivered;
            evt.AttemptCount = 1;
            evt.LastAttemptAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync();
        }
    }

    private async Task MarkEventAsFailedAsync(Guid eventId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var evt = await dbContext.OutboundEvents.FindAsync(eventId);
        if (evt != null)
        {
            evt.Status = OutboundEventStatus.Failed;
            evt.AttemptCount = 3;
            evt.LastAttemptAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync();
        }
    }
}
