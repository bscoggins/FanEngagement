using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.OutboundEvents;
using FanEngagement.Application.Proposals;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Tests verifying outbound event enqueue behavior during proposal lifecycle transitions.
/// Confirms that ProposalOpened, ProposalClosed, and ProposalFinalized events are created
/// with correct metadata when proposals transition states.
/// </summary>
public class OutboundEventEnqueueTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public OutboundEventEnqueueTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task OpeningProposal_EnqueuesProposalOpenedEvent()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);
        var (user, _) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, user.Id);
        await AddOptionAsync(proposal.Id, "Option 1");
        await AddOptionAsync(proposal.Id, "Option 2");

        // Act
        await OpenProposalAsync(proposal.Id);

        // Assert - check for enqueued event
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        
        var outboundEvent = await dbContext.OutboundEvents
            .Where(e => e.OrganizationId == org.Id && e.EventType == "ProposalOpened")
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync();

        Assert.NotNull(outboundEvent);
        Assert.Equal(OutboundEventStatus.Pending, outboundEvent.Status);
        Assert.Equal(org.Id, outboundEvent.OrganizationId);
        
        // Verify payload contains proposal metadata
        var payload = JsonDocument.Parse(outboundEvent.Payload);
        Assert.Equal(proposal.Id.ToString(), payload.RootElement.GetProperty("proposalId").GetString());
        Assert.Equal("Open", payload.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task ClosingProposal_EnqueuesProposalClosedEvent()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);
        var (user, userToken) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, user.Id);
        var option = await AddOptionAsync(proposal.Id, "Option 1");
        await AddOptionAsync(proposal.Id, "Option 2");
        await OpenProposalAsync(proposal.Id);

        // Cast a vote
        _client.AddAuthorizationHeader(userToken);
        await CastVoteAsync(proposal.Id, option.Id, user.Id);

        // Act
        _client.AddAuthorizationHeader(adminToken);
        await CloseProposalAsync(proposal.Id);

        // Assert - check for ProposalClosed event
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        
        var outboundEvent = await dbContext.OutboundEvents
            .Where(e => e.OrganizationId == org.Id && e.EventType == "ProposalClosed")
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync();

        Assert.NotNull(outboundEvent);
        Assert.Equal(OutboundEventStatus.Pending, outboundEvent.Status);
        
        // Verify payload contains result metadata
        var payload = JsonDocument.Parse(outboundEvent.Payload);
        Assert.Equal(proposal.Id.ToString(), payload.RootElement.GetProperty("proposalId").GetString());
        Assert.Equal("Closed", payload.RootElement.GetProperty("status").GetString());
        Assert.True(payload.RootElement.TryGetProperty("winningOptionId", out _));
        Assert.True(payload.RootElement.TryGetProperty("quorumMet", out _));
        Assert.True(payload.RootElement.TryGetProperty("totalVotesCast", out _));
    }

    [Fact]
    public async Task FinalizingProposal_EnqueuesProposalFinalizedEvent()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);
        var (user, userToken) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, user.Id);
        var option = await AddOptionAsync(proposal.Id, "Option 1");
        await AddOptionAsync(proposal.Id, "Option 2");
        await OpenProposalAsync(proposal.Id);

        _client.AddAuthorizationHeader(userToken);
        await CastVoteAsync(proposal.Id, option.Id, user.Id);

        _client.AddAuthorizationHeader(adminToken);
        await CloseProposalAsync(proposal.Id);

        // Act
        await FinalizeProposalAsync(proposal.Id);

        // Assert - check for ProposalFinalized event
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        
        var outboundEvent = await dbContext.OutboundEvents
            .Where(e => e.OrganizationId == org.Id && e.EventType == "ProposalFinalized")
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync();

        Assert.NotNull(outboundEvent);
        Assert.Equal(OutboundEventStatus.Pending, outboundEvent.Status);
        
        var payload = JsonDocument.Parse(outboundEvent.Payload);
        Assert.Equal(proposal.Id.ToString(), payload.RootElement.GetProperty("proposalId").GetString());
        Assert.Equal("Finalized", payload.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task CompleteLifecycle_EnqueuesAllThreeEvents()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);
        var (user, userToken) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, user.Id);
        var option = await AddOptionAsync(proposal.Id, "Option 1");
        await AddOptionAsync(proposal.Id, "Option 2");

        // Act - complete lifecycle
        await OpenProposalAsync(proposal.Id);
        
        _client.AddAuthorizationHeader(userToken);
        await CastVoteAsync(proposal.Id, option.Id, user.Id);
        
        _client.AddAuthorizationHeader(adminToken);
        await CloseProposalAsync(proposal.Id);
        await FinalizeProposalAsync(proposal.Id);

        // Assert - check for all three events
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        
        var events = await dbContext.OutboundEvents
            .Where(e => e.OrganizationId == org.Id)
            .ToListAsync();

        var proposalEvents = events
            .Where(e => e.Payload.Contains(proposal.Id.ToString()))
            .ToList();

        Assert.Contains(proposalEvents, e => e.EventType == "ProposalOpened");
        Assert.Contains(proposalEvents, e => e.EventType == "ProposalClosed");
        Assert.Contains(proposalEvents, e => e.EventType == "ProposalFinalized");
    }

    [Fact]
    public async Task OutboundEventPayload_ContainsCorrectOrganizationId()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);
        var (user, _) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, user.Id);
        await AddOptionAsync(proposal.Id, "Option 1");
        await AddOptionAsync(proposal.Id, "Option 2");

        // Act
        await OpenProposalAsync(proposal.Id);

        // Assert
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        
        var outboundEvent = await dbContext.OutboundEvents
            .Where(e => e.EventType == "ProposalOpened" && e.OrganizationId == org.Id)
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync();

        Assert.NotNull(outboundEvent);
        
        var payload = JsonDocument.Parse(outboundEvent.Payload);
        Assert.Equal(org.Id.ToString(), payload.RootElement.GetProperty("organizationId").GetString());
    }

    [Fact]
    public async Task OutboundEvent_HasCorrectCreatedAtTimestamp()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);
        var (user, _) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, user.Id);
        await AddOptionAsync(proposal.Id, "Option 1");
        await AddOptionAsync(proposal.Id, "Option 2");

        var beforeOpen = DateTimeOffset.UtcNow;

        // Act
        await OpenProposalAsync(proposal.Id);

        var afterOpen = DateTimeOffset.UtcNow;

        // Assert
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        
        var outboundEvent = await dbContext.OutboundEvents
            .Where(e => e.EventType == "ProposalOpened" && e.OrganizationId == org.Id)
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync();

        Assert.NotNull(outboundEvent);
        Assert.True(outboundEvent.CreatedAt >= beforeOpen);
        Assert.True(outboundEvent.CreatedAt <= afterOpen);
    }

    [Fact]
    public async Task ClosedProposalEvent_IncludesWinnerAndQuorum()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);
        var (user, userToken) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalWithQuorumAsync(org.Id, user.Id, 50m);
        var option1 = await AddOptionAsync(proposal.Id, "Winner Option");
        await AddOptionAsync(proposal.Id, "Loser Option");
        await OpenProposalAsync(proposal.Id);

        _client.AddAuthorizationHeader(userToken);
        await CastVoteAsync(proposal.Id, option1.Id, user.Id);

        // Act
        _client.AddAuthorizationHeader(adminToken);
        await CloseProposalAsync(proposal.Id);

        // Assert
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        
        var outboundEvent = await dbContext.OutboundEvents
            .Where(e => e.EventType == "ProposalClosed" && e.OrganizationId == org.Id)
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync();

        Assert.NotNull(outboundEvent);
        
        var payload = JsonDocument.Parse(outboundEvent.Payload);
        Assert.Equal(option1.Id.ToString(), payload.RootElement.GetProperty("winningOptionId").GetString());
        Assert.True(payload.RootElement.GetProperty("quorumMet").GetBoolean());
        Assert.Equal(100m, payload.RootElement.GetProperty("totalVotesCast").GetDecimal());
    }

    #region Helper Methods

    private async Task<(string adminToken, Organization org)> SetupOrganizationAsync()
    {
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"Test Organization {Guid.NewGuid()}",
            Description = "Test Organization"
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();
        return (adminToken, org!);
    }

    private async Task<ShareType> CreateShareTypeAsync(Guid orgId)
    {
        var request = new CreateShareTypeRequest
        {
            Name = "Common Shares",
            Symbol = "COM",
            VotingWeight = 1.0m,
            IsTransferable = true
        };
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", request);
        return (await response.Content.ReadFromJsonAsync<ShareType>())!;
    }

    private async Task<(UserDto user, string token)> CreateMemberWithSharesAsync(Guid orgId, Guid shareTypeId, decimal shares)
    {
        var password = "TestPassword123!";
        var userRequest = new CreateUserRequest
        {
            Email = $"user-{Guid.NewGuid()}@test.com",
            DisplayName = "Test User",
            Password = password
        };
        var userResponse = await _client.PostAsJsonAsync("/users", userRequest);
        var user = await userResponse.Content.ReadFromJsonAsync<UserDto>();

        var membershipRequest = new CreateMembershipRequest
        {
            UserId = user!.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", membershipRequest);

        var issuanceRequest = new CreateShareIssuanceRequest
        {
            UserId = user.Id,
            ShareTypeId = shareTypeId,
            Quantity = shares,
            Reason = "Test allocation"
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", issuanceRequest);

        var loginResponse = await _client.PostAsJsonAsync("/auth/login", new { Email = userRequest.Email, Password = password });
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<FanEngagement.Application.Authentication.LoginResponse>();

        return (user, loginResult!.Token);
    }

    private async Task<ProposalDto> CreateProposalAsync(Guid orgId, Guid createdByUserId)
    {
        var request = new CreateProposalRequest
        {
            Title = $"Test Proposal {Guid.NewGuid()}",
            CreatedByUserId = createdByUserId
        };
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", request);
        return (await response.Content.ReadFromJsonAsync<ProposalDto>())!;
    }

    private async Task<ProposalDto> CreateProposalWithQuorumAsync(Guid orgId, Guid createdByUserId, decimal quorum)
    {
        var request = new CreateProposalRequest
        {
            Title = $"Test Proposal {Guid.NewGuid()}",
            CreatedByUserId = createdByUserId,
            QuorumRequirement = quorum
        };
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", request);
        return (await response.Content.ReadFromJsonAsync<ProposalDto>())!;
    }

    private async Task<ProposalOptionDto> AddOptionAsync(Guid proposalId, string text)
    {
        var request = new AddProposalOptionRequest { Text = text };
        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/options", request);
        return (await response.Content.ReadFromJsonAsync<ProposalOptionDto>())!;
    }

    private async Task<ProposalDto> OpenProposalAsync(Guid proposalId)
    {
        var response = await _client.PostAsync($"/proposals/{proposalId}/open", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ProposalDto>())!;
    }

    private async Task<ProposalDto> CloseProposalAsync(Guid proposalId)
    {
        var response = await _client.PostAsync($"/proposals/{proposalId}/close", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ProposalDto>())!;
    }

    private async Task<ProposalDto> FinalizeProposalAsync(Guid proposalId)
    {
        var response = await _client.PostAsync($"/proposals/{proposalId}/finalize", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ProposalDto>())!;
    }

    private async Task<VoteDto> CastVoteAsync(Guid proposalId, Guid optionId, Guid userId)
    {
        var request = new CastVoteRequest
        {
            UserId = userId,
            ProposalOptionId = optionId
        };
        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/votes", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<VoteDto>())!;
    }

    #endregion
}
