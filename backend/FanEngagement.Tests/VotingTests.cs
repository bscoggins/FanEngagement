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

public class VotingTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public VotingTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    private async Task<(Guid organizationId, Guid userId, Guid shareTypeId, Guid proposalId, Guid optionId)> SetupTestDataAsync()
    {
        // Get admin authentication token for setup operations
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization (requires admin)
        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"Test Organization {Guid.NewGuid()}",
            Description = "Test Organization"
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();

        // Create user (requires admin)
        var userRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = "TestPassword123!"
        };
        var userResponse = await _client.PostAsJsonAsync("/users", userRequest);
        var user = await userResponse.Content.ReadFromJsonAsync<User>();

        // Create membership with OrgAdmin role so tests can perform operations (requires OrgAdmin)
        var membershipRequest = new CreateMembershipRequest
        {
            UserId = user!.Id,
            Role = OrganizationRole.OrgAdmin
        };
        await _client.PostAsJsonAsync($"/organizations/{org!.Id}/memberships", membershipRequest);

        // Create share type (requires OrgAdmin)
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Shares",
            Symbol = "TST",
            Description = "Test share type",
            VotingWeight = 1.0m,
            MaxSupply = null,
            IsTransferable = true
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-types", shareTypeRequest);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();

        // Issue shares to user
        var issuanceRequest = new CreateShareIssuanceRequest
        {
            UserId = user.Id,
            ShareTypeId = shareType!.Id,
            Quantity = 100.0m,
            Reason = "Initial allocation"
        };
        await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-issuances", issuanceRequest);

        // Create proposal
        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test proposal for voting",
            CreatedByUserId = user.Id
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{org.Id}/proposals", proposalRequest);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add option
        var optionRequest = new AddProposalOptionRequest
        {
            Text = "Option 1",
            Description = "First option"
        };
        var optionResponse = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", optionRequest);
        var option = await optionResponse.Content.ReadFromJsonAsync<ProposalOptionDto>();

        return (org.Id, user.Id, shareType.Id, proposal.Id, option!.Id);
    }

    [Fact]
    public async Task CastVote_ReturnsCreated_WithValidVote()
    {
        // Arrange
        var (_, userId, _, proposalId, optionId) = await SetupTestDataAsync();

        var voteRequest = new CastVoteRequest
        {
            ProposalOptionId = optionId,
            UserId = userId
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/votes", voteRequest);

        // Assert
        if (response.StatusCode != HttpStatusCode.Created)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var vote = await response.Content.ReadFromJsonAsync<VoteDto>();
        Assert.NotNull(vote);
        Assert.NotEqual(Guid.Empty, vote!.Id);
        Assert.Equal(proposalId, vote.ProposalId);
        Assert.Equal(optionId, vote.ProposalOptionId);
        Assert.Equal(userId, vote.UserId);
        Assert.Equal(100.0m, vote.VotingPower); // 100 shares * 1.0 voting weight
    }

    [Fact]
    public async Task CastVote_CalculatesVotingPower_BasedOnShareBalances()
    {
        // Arrange
        var (orgId, userId, _, proposalId, optionId) = await SetupTestDataAsync();

        // Create another share type with different voting weight
        var shareType2Request = new CreateShareTypeRequest
        {
            Name = "Premium Shares",
            Symbol = "PRM",
            VotingWeight = 2.5m,
            MaxSupply = null,
            IsTransferable = true
        };
        var shareType2Response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareType2Request);
        var shareType2 = await shareType2Response.Content.ReadFromJsonAsync<ShareType>();

        // Issue premium shares to user
        var issuance2Request = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareType2!.Id,
            Quantity = 50.0m,
            Reason = "Premium allocation"
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", issuance2Request);

        var voteRequest = new CastVoteRequest
        {
            ProposalOptionId = optionId,
            UserId = userId
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/votes", voteRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var vote = await response.Content.ReadFromJsonAsync<VoteDto>();
        Assert.NotNull(vote);
        // Expected: 100 * 1.0 + 50 * 2.5 = 100 + 125 = 225
        Assert.Equal(225.0m, vote!.VotingPower);
    }

    [Fact]
    public async Task CastVote_ReturnsBadRequest_WhenUserAlreadyVoted()
    {
        // Arrange
        var (_, userId, _, proposalId, optionId) = await SetupTestDataAsync();

        var voteRequest = new CastVoteRequest
        {
            ProposalOptionId = optionId,
            UserId = userId
        };

        // Cast first vote
        await _client.PostAsJsonAsync($"/proposals/{proposalId}/votes", voteRequest);

        // Act - Try to vote again
        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/votes", voteRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.Contains("already voted", error!.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CastVote_ReturnsBadRequest_WhenProposalIsClosed()
    {
        // Arrange
        var (_, userId, _, proposalId, optionId) = await SetupTestDataAsync();

        // Close the proposal
        await _client.PostAsync($"/proposals/{proposalId}/close", null);

        var voteRequest = new CastVoteRequest
        {
            ProposalOptionId = optionId,
            UserId = userId
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/votes", voteRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.Contains("Closed", error!.Error);
    }

    [Fact]
    public async Task CastVote_ReturnsBadRequest_WhenUserHasNoVotingPower()
    {
        // Arrange
        var (orgId, _, _, proposalId, optionId) = await SetupTestDataAsync();

        // Create another user with no shares
        var userRequest = new CreateUserRequest
        {
            Email = $"nopower-{Guid.NewGuid()}@example.com",
            DisplayName = "No Power User",
            Password = "TestPassword123!"
        };
        var userResponse = await _client.PostAsJsonAsync("/users", userRequest);
        var user = await userResponse.Content.ReadFromJsonAsync<User>();

        // Add membership but don't issue shares
        var membershipRequest = new CreateMembershipRequest
        {
            UserId = user!.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", membershipRequest);

        var voteRequest = new CastVoteRequest
        {
            ProposalOptionId = optionId,
            UserId = user.Id
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/votes", voteRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.Contains("no voting power", error!.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CastVote_ReturnsBadRequest_WhenOptionDoesNotBelongToProposal()
    {
        // Arrange
        var (orgId, userId, _, proposalId, _) = await SetupTestDataAsync();

        // Create another proposal with its own option
        var proposal2Request = new CreateProposalRequest
        {
            Title = "Another Proposal",
            CreatedByUserId = userId
        };
        var proposal2Response = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposal2Request);
        var proposal2 = await proposal2Response.Content.ReadFromJsonAsync<ProposalDto>();

        var option2Request = new AddProposalOptionRequest { Text = "Other Option" };
        var option2Response = await _client.PostAsJsonAsync($"/proposals/{proposal2!.Id}/options", option2Request);
        var option2 = await option2Response.Content.ReadFromJsonAsync<ProposalOptionDto>();

        // Try to vote on proposal1 with option from proposal2
        var voteRequest = new CastVoteRequest
        {
            ProposalOptionId = option2!.Id,
            UserId = userId
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/votes", voteRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetResults_ReturnsVotingResults()
    {
        // Arrange
        var (orgId, userId, shareTypeId, proposalId, option1Id) = await SetupTestDataAsync();

        // Add another option
        var option2Request = new AddProposalOptionRequest { Text = "Option 2" };
        var option2Response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/options", option2Request);
        var option2 = await option2Response.Content.ReadFromJsonAsync<ProposalOptionDto>();

        // Create another user and issue shares
        var user2Request = new CreateUserRequest
        {
            Email = $"voter2-{Guid.NewGuid()}@example.com",
            DisplayName = "Voter 2",
            Password = "TestPassword123!"
        };
        var user2Response = await _client.PostAsJsonAsync("/users", user2Request);
        var user2 = await user2Response.Content.ReadFromJsonAsync<User>();

        var membership2Request = new CreateMembershipRequest
        {
            UserId = user2!.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", membership2Request);

        var issuance2Request = new CreateShareIssuanceRequest
        {
            UserId = user2.Id,
            ShareTypeId = shareTypeId,
            Quantity = 75.0m,
            Reason = "Allocation"
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", issuance2Request);

        // Cast votes
        var vote1Request = new CastVoteRequest
        {
            ProposalOptionId = option1Id,
            UserId = userId
        };
        await _client.PostAsJsonAsync($"/proposals/{proposalId}/votes", vote1Request);

        var vote2Request = new CastVoteRequest
        {
            ProposalOptionId = option2!.Id,
            UserId = user2.Id
        };
        await _client.PostAsJsonAsync($"/proposals/{proposalId}/votes", vote2Request);

        // Act
        var response = await _client.GetAsync($"/proposals/{proposalId}/results");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var results = await response.Content.ReadFromJsonAsync<ProposalResultsDto>();
        Assert.NotNull(results);
        Assert.Equal(proposalId, results!.ProposalId);
        Assert.Equal(2, results.OptionResults.Count);
        Assert.Equal(175.0m, results.TotalVotingPower); // 100 + 75

        var option1Result = results.OptionResults.First(r => r.OptionId == option1Id);
        Assert.Equal(1, option1Result.VoteCount);
        Assert.Equal(100.0m, option1Result.TotalVotingPower);

        var option2Result = results.OptionResults.First(r => r.OptionId == option2.Id);
        Assert.Equal(1, option2Result.VoteCount);
        Assert.Equal(75.0m, option2Result.TotalVotingPower);
    }

    [Fact]
    public async Task GetResults_ReturnsEmptyResults_WhenNoVotes()
    {
        // Arrange
        var (_, _, _, proposalId, _) = await SetupTestDataAsync();

        // Act
        var response = await _client.GetAsync($"/proposals/{proposalId}/results");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var results = await response.Content.ReadFromJsonAsync<ProposalResultsDto>();
        Assert.NotNull(results);
        Assert.Equal(proposalId, results!.ProposalId);
        Assert.Equal(0m, results.TotalVotingPower);
    }

    [Fact]
    public async Task GetResults_ReturnsNotFound_WhenProposalDoesNotExist()
    {
        // Arrange - need auth to access results endpoint
        // Create minimal setup with org membership
        var (orgId, userId, shareTypeId, proposalId, optionId) = await SetupTestDataAsync();
        
        // Act - try to get results for non-existent proposal
        var response = await _client.GetAsync($"/proposals/{Guid.NewGuid()}/results");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private sealed record ErrorResponse(string Error);
}
