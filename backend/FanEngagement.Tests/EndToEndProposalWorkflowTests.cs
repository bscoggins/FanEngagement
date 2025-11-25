using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Proposals;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// End-to-end integration tests for complete proposal workflows.
/// Tests cover the full lifecycle from organization setup through proposal finalization,
/// verifying all status transitions, voting rules, and quorum enforcement.
/// </summary>
public class EndToEndProposalWorkflowTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public EndToEndProposalWorkflowTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    /// <summary>
    /// Complete end-to-end test: Create org → Create users → Issue shares → Create proposal → 
    /// Add options → Open → Vote → Close → Verify results → Finalize
    /// </summary>
    [Fact]
    public async Task CompleteProposalLifecycle_FromDraftToFinalized_AllStepsSucceed()
    {
        // Arrange - Set up organization with admin
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create share type for voting
        var shareType = await CreateShareTypeAsync(org.Id);

        // Create two eligible voters with shares
        var (voter1, voter1Token) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);
        var (voter2, voter2Token) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 50m);

        // Create proposal in Draft status
        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, voter1.Id);
        Assert.Equal(ProposalStatus.Draft, proposal.Status);

        // Add options
        var option1 = await AddOptionAsync(proposal.Id, "Approve the motion");
        var option2 = await AddOptionAsync(proposal.Id, "Reject the motion");

        // Open the proposal
        var openedProposal = await OpenProposalAsync(proposal.Id);
        Assert.Equal(ProposalStatus.Open, openedProposal.Status);
        Assert.Equal(150m, openedProposal.EligibleVotingPowerSnapshot); // 100 + 50

        // Vote as voter1
        _client.AddAuthorizationHeader(voter1Token);
        var vote1 = await CastVoteAsync(proposal.Id, option1.Id, voter1.Id);
        Assert.Equal(100m, vote1.VotingPower);

        // Vote as voter2
        _client.AddAuthorizationHeader(voter2Token);
        var vote2 = await CastVoteAsync(proposal.Id, option2.Id, voter2.Id);
        Assert.Equal(50m, vote2.VotingPower);

        // Close the proposal (as admin)
        _client.AddAuthorizationHeader(adminToken);
        var closedProposal = await CloseProposalAsync(proposal.Id);
        Assert.Equal(ProposalStatus.Closed, closedProposal.Status);
        Assert.Equal(option1.Id, closedProposal.WinningOptionId);
        Assert.True(closedProposal.QuorumMet);
        Assert.Equal(150m, closedProposal.TotalVotesCast);
        Assert.NotNull(closedProposal.ClosedAt);

        // Finalize the proposal
        var finalizedProposal = await FinalizeProposalAsync(proposal.Id);
        Assert.Equal(ProposalStatus.Finalized, finalizedProposal.Status);

        // Verify final results
        var results = await GetResultsAsync(proposal.Id);
        Assert.Equal(proposal.Id, results.ProposalId);
        Assert.Equal(150m, results.TotalVotingPower);
        Assert.True(results.QuorumMet);
        Assert.Equal(option1.Id, results.WinningOptionId);
    }

    [Fact]
    public async Task ProposalWithQuorumNotMet_CloseSucceeds_QuorumMetFalse()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);

        // Create two voters with shares but only one will vote
        var (voter1, voter1Token) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);
        var (_, _) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m); // voter2 won't vote

        // Create proposal with 60% quorum requirement
        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalWithQuorumAsync(org.Id, voter1.Id, 60m);
        var option1 = await AddOptionAsync(proposal.Id, "Option A");
        await AddOptionAsync(proposal.Id, "Option B");
        await OpenProposalAsync(proposal.Id);

        // Only voter1 votes (50% participation, below 60% quorum)
        _client.AddAuthorizationHeader(voter1Token);
        await CastVoteAsync(proposal.Id, option1.Id, voter1.Id);

        // Close
        _client.AddAuthorizationHeader(adminToken);
        var closedProposal = await CloseProposalAsync(proposal.Id);

        // Assert - quorum not met
        Assert.Equal(ProposalStatus.Closed, closedProposal.Status);
        Assert.False(closedProposal.QuorumMet);
        Assert.Equal(100m, closedProposal.TotalVotesCast); // 100 of 200 total
    }

    [Fact]
    public async Task VotingOnClosedProposal_ReturnsBadRequest()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);
        var (voter1, voter1Token) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, voter1.Id);
        var option1 = await AddOptionAsync(proposal.Id, "Option A");
        await AddOptionAsync(proposal.Id, "Option B");
        await OpenProposalAsync(proposal.Id);
        await CloseProposalAsync(proposal.Id);

        // Act - try to vote on closed proposal
        _client.AddAuthorizationHeader(voter1Token);
        var response = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", new CastVoteRequest
        {
            UserId = voter1.Id,
            ProposalOptionId = option1.Id
        });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("Closed", error);
    }

    [Fact]
    public async Task VotingTwice_ReturnsBadRequest()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);
        var (voter1, voter1Token) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, voter1.Id);
        var option1 = await AddOptionAsync(proposal.Id, "Option A");
        await AddOptionAsync(proposal.Id, "Option B");
        await OpenProposalAsync(proposal.Id);

        // First vote succeeds
        _client.AddAuthorizationHeader(voter1Token);
        await CastVoteAsync(proposal.Id, option1.Id, voter1.Id);

        // Act - second vote fails
        var response = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", new CastVoteRequest
        {
            UserId = voter1.Id,
            ProposalOptionId = option1.Id
        });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("already voted", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task OpenProposalWithoutOptions_ReturnsBadRequest()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);
        var (voter1, _) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, voter1.Id);

        // Act - try to open without options
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("options", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task FinalizeWithoutClosing_ReturnsBadRequest()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareType = await CreateShareTypeAsync(org.Id);
        var (voter1, _) = await CreateMemberWithSharesAsync(org.Id, shareType.Id, 100m);

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, voter1.Id);
        await AddOptionAsync(proposal.Id, "Option A");
        await AddOptionAsync(proposal.Id, "Option B");
        await OpenProposalAsync(proposal.Id);

        // Act - try to finalize while Open
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/finalize", null);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task VotingPowerCalculation_WithMultipleShareTypes_IsAccurate()
    {
        // Arrange
        var (adminToken, org) = await SetupOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create two share types with different voting weights
        var shareType1 = await CreateShareTypeWithWeightAsync(org.Id, "Common", 1.0m);
        var shareType2 = await CreateShareTypeWithWeightAsync(org.Id, "Preferred", 2.0m);

        // Create voter with both share types
        var (voter, voterToken) = await CreateMemberAsync(org.Id);
        await IssueSharesAsync(org.Id, voter.Id, shareType1.Id, 100m);
        await IssueSharesAsync(org.Id, voter.Id, shareType2.Id, 50m);
        // Expected voting power: 100 * 1.0 + 50 * 2.0 = 200

        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, voter.Id);
        var option = await AddOptionAsync(proposal.Id, "Option A");
        await AddOptionAsync(proposal.Id, "Option B");
        await OpenProposalAsync(proposal.Id);

        // Act
        _client.AddAuthorizationHeader(voterToken);
        var vote = await CastVoteAsync(proposal.Id, option.Id, voter.Id);

        // Assert
        Assert.Equal(200m, vote.VotingPower);
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
        Assert.Equal(HttpStatusCode.Created, orgResponse.StatusCode);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();
        return (adminToken, org!);
    }

    private async Task<ShareType> CreateShareTypeAsync(Guid orgId)
    {
        return await CreateShareTypeWithWeightAsync(orgId, "Common Shares", 1.0m);
    }

    private async Task<ShareType> CreateShareTypeWithWeightAsync(Guid orgId, string name, decimal weight)
    {
        var request = new CreateShareTypeRequest
        {
            Name = name,
            Symbol = name.Substring(0, Math.Min(3, name.Length)).ToUpper(),
            VotingWeight = weight,
            IsTransferable = true
        };
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ShareType>())!;
    }

    private async Task<(UserDto user, string token)> CreateMemberWithSharesAsync(Guid orgId, Guid shareTypeId, decimal shares)
    {
        var (user, token) = await CreateMemberAsync(orgId);
        await IssueSharesAsync(orgId, user.Id, shareTypeId, shares);
        return (user, token);
    }

    private async Task<(UserDto user, string token)> CreateMemberAsync(Guid orgId)
    {
        // Create user
        var userRequest = new CreateUserRequest
        {
            Email = $"user-{Guid.NewGuid()}@test.com",
            DisplayName = "Test User",
            Password = "TestPassword123!"
        };
        var userResponse = await _client.PostAsJsonAsync("/users", userRequest);
        Assert.Equal(HttpStatusCode.Created, userResponse.StatusCode);
        var user = await userResponse.Content.ReadFromJsonAsync<UserDto>();

        // Add membership
        var membershipRequest = new CreateMembershipRequest
        {
            UserId = user!.Id,
            Role = OrganizationRole.Member
        };
        var membershipResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", membershipRequest);
        Assert.Equal(HttpStatusCode.Created, membershipResponse.StatusCode);

        // Login for token
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", new { Email = userRequest.Email, Password = userRequest.Password });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<FanEngagement.Application.Authentication.LoginResponse>();

        return (user, loginResult!.Token);
    }

    private async Task IssueSharesAsync(Guid orgId, Guid userId, Guid shareTypeId, decimal quantity)
    {
        var request = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareTypeId,
            Quantity = quantity,
            Reason = "Test allocation"
        };
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private async Task<ProposalDto> CreateProposalAsync(Guid orgId, Guid createdByUserId)
    {
        var request = new CreateProposalRequest
        {
            Title = $"Test Proposal {Guid.NewGuid()}",
            Description = "Test proposal for voting",
            CreatedByUserId = createdByUserId
        };
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ProposalDto>())!;
    }

    private async Task<ProposalDto> CreateProposalWithQuorumAsync(Guid orgId, Guid createdByUserId, decimal quorum)
    {
        var request = new CreateProposalRequest
        {
            Title = $"Test Proposal {Guid.NewGuid()}",
            Description = "Test proposal",
            CreatedByUserId = createdByUserId,
            QuorumRequirement = quorum
        };
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ProposalDto>())!;
    }

    private async Task<ProposalOptionDto> AddOptionAsync(Guid proposalId, string text)
    {
        var request = new AddProposalOptionRequest { Text = text };
        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/options", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
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
        if (response.StatusCode != HttpStatusCode.Created)
        {
            var error = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Vote failed: {response.StatusCode} - {error}");
        }
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<VoteDto>())!;
    }

    private async Task<ProposalResultsDto> GetResultsAsync(Guid proposalId)
    {
        var response = await _client.GetAsync($"/proposals/{proposalId}/results");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ProposalResultsDto>())!;
    }

    #endregion
}
