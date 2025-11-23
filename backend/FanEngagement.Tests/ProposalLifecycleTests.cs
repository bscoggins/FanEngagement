using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Authentication;
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
/// Integration tests for automatic proposal lifecycle management and quorum enforcement.
/// Tests cover:
/// - Manual open/close/finalize operations
/// - Voting eligibility validation
/// - Quorum scenarios
/// - Time-bounded voting
/// </summary>
public class ProposalLifecycleTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public ProposalLifecycleTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    private async Task<(Guid organizationId, Guid userId, Guid shareTypeId)> SetupTestDataWithSharesAsync()
    {
        // Get admin authentication token for setup operations
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization
        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"Test Organization {Guid.NewGuid()}",
            Description = "Test Organization"
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();

        // Create user
        var userRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = "TestPassword123!"
        };
        var userResponse = await _client.PostAsJsonAsync("/users", userRequest);
        var user = await userResponse.Content.ReadFromJsonAsync<User>();

        // Create membership with OrgAdmin role
        var membershipRequest = new CreateMembershipRequest
        {
            UserId = user!.Id,
            Role = OrganizationRole.OrgAdmin
        };
        await _client.PostAsJsonAsync($"/organizations/{org!.Id}/memberships", membershipRequest);

        // Create share type
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Common Shares",
            Symbol = "COMMON",
            Description = "Common voting shares",
            VotingWeight = 1.0m,
            MaxSupply = 1000000m,
            IsTransferable = false
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-types", shareTypeRequest);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();

        // Issue shares to user
        var issuanceRequest = new CreateShareIssuanceRequest
        {
            UserId = user.Id,
            ShareTypeId = shareType!.Id,
            Quantity = 100m,
            Reason = "Initial allocation"
        };
        await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-issuances", issuanceRequest);

        // Login as the created user
        var loginRequest = new LoginRequest
        {
            Email = userRequest.Email,
            Password = userRequest.Password
        };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        _client.AddAuthorizationHeader(loginResult!.Token);

        return (org.Id, user.Id, shareType.Id);
    }

    [Fact]
    public async Task CreateProposal_StartsInDraftStatus()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataWithSharesAsync();
        var request = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test proposal description",
            CreatedByUserId = userId,
            QuorumRequirement = 50.0m
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var proposal = await response.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(proposal);
        Assert.Equal(ProposalStatus.Draft, proposal.Status);
    }

    [Fact]
    public async Task OpenProposal_RequiresTwoOptions()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataWithSharesAsync();
        
        // Create proposal in Draft
        var createRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            CreatedByUserId = userId
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", createRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Act - try to open without options
        var openResponse = await _client.PostAsync($"/proposals/{proposal!.Id}/open", null);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, openResponse.StatusCode);
    }

    [Fact]
    public async Task OpenProposal_CapturesVotingPowerSnapshot()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataWithSharesAsync();
        
        // Create proposal with options
        var createRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            CreatedByUserId = userId
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", createRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add options
        await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });

        // Act - open proposal
        var openResponse = await _client.PostAsync($"/proposals/{proposal.Id}/open", null);
        
        // Assert
        Assert.Equal(HttpStatusCode.OK, openResponse.StatusCode);
        var openedProposal = await openResponse.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(openedProposal);
        Assert.Equal(ProposalStatus.Open, openedProposal.Status);
        Assert.NotNull(openedProposal.EligibleVotingPowerSnapshot);
        Assert.Equal(100m, openedProposal.EligibleVotingPowerSnapshot); // User has 100 shares with weight 1.0
    }

    [Fact]
    public async Task VoteOnProposal_RequiresOpenStatus()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataWithSharesAsync();
        
        // Create proposal in Draft
        var createRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            CreatedByUserId = userId
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", createRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add options
        var option1Response = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        var option1 = await option1Response.Content.ReadFromJsonAsync<ProposalOptionDto>();

        // Act - try to vote on Draft proposal
        var voteRequest = new CastVoteRequest
        {
            UserId = userId,
            ProposalOptionId = option1!.Id
        };
        var voteResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", voteRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, voteResponse.StatusCode);
    }

    [Fact]
    public async Task VoteOnProposal_RequiresVotingPower()
    {
        // Arrange - create user with NO shares
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();

        var userRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "No Shares User",
            Password = "TestPassword123!"
        };
        var userResponse = await _client.PostAsJsonAsync("/users", userRequest);
        var user = await userResponse.Content.ReadFromJsonAsync<User>();

        var membershipRequest = new CreateMembershipRequest
        {
            UserId = user!.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{org!.Id}/memberships", membershipRequest);

        // Login as user
        var loginRequest = new LoginRequest { Email = userRequest.Email, Password = userRequest.Password };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        _client.AddAuthorizationHeader(loginResult!.Token);

        // Create and open proposal (as admin first)
        _client.AddAuthorizationHeader(adminToken);
        var createRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            CreatedByUserId = user.Id
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{org.Id}/proposals", createRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var option1Response = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        var option1 = await option1Response.Content.ReadFromJsonAsync<ProposalOptionDto>();
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Switch back to user token
        _client.AddAuthorizationHeader(loginResult.Token);

        // Act - try to vote without voting power
        var voteRequest = new CastVoteRequest
        {
            UserId = user.Id,
            ProposalOptionId = option1!.Id
        };
        var voteResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", voteRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, voteResponse.StatusCode);
        var errorBody = await voteResponse.Content.ReadAsStringAsync();
        Assert.Contains("no voting power", errorBody, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task VoteOnProposal_PreventsDuplicateVotes()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataWithSharesAsync();
        
        // Create and open proposal
        var createRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            CreatedByUserId = userId
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", createRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var option1Response = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        var option1 = await option1Response.Content.ReadFromJsonAsync<ProposalOptionDto>();
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Cast first vote
        var voteRequest = new CastVoteRequest
        {
            UserId = userId,
            ProposalOptionId = option1!.Id
        };
        var firstVoteResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", voteRequest);
        Assert.Equal(HttpStatusCode.Created, firstVoteResponse.StatusCode);

        // Act - try to vote again
        var secondVoteResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", voteRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, secondVoteResponse.StatusCode);
        var errorBody = await secondVoteResponse.Content.ReadAsStringAsync();
        Assert.Contains("already voted", errorBody, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CloseProposal_ComputesResults()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataWithSharesAsync();
        
        // Create and open proposal
        var createRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            CreatedByUserId = userId,
            QuorumRequirement = 50.0m
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", createRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var option1Response = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        var option1 = await option1Response.Content.ReadFromJsonAsync<ProposalOptionDto>();
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Cast vote
        var voteRequest = new CastVoteRequest
        {
            UserId = userId,
            ProposalOptionId = option1!.Id
        };
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", voteRequest);

        // Act - close proposal
        var closeResponse = await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, closeResponse.StatusCode);
        var closedProposal = await closeResponse.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(closedProposal);
        Assert.Equal(ProposalStatus.Closed, closedProposal.Status);
        Assert.Equal(option1.Id, closedProposal.WinningOptionId);
        Assert.True(closedProposal.QuorumMet); // 100% participation meets 50% quorum
        Assert.Equal(100m, closedProposal.TotalVotesCast);
        Assert.NotNull(closedProposal.ClosedAt);
    }

    [Fact]
    public async Task CloseProposal_QuorumNotMet_WhenInsufficientVotes()
    {
        // Arrange - create two users, only one votes
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();

        // Create share type
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Common Shares",
            Symbol = "COMMON",
            VotingWeight = 1.0m,
            IsTransferable = false
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/share-types", shareTypeRequest);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();

        // Create two users with shares
        var user1Request = new CreateUserRequest
        {
            Email = $"user1-{Guid.NewGuid()}@example.com",
            DisplayName = "User 1",
            Password = "TestPassword123!"
        };
        var user1Response = await _client.PostAsJsonAsync("/users", user1Request);
        var user1 = await user1Response.Content.ReadFromJsonAsync<User>();

        var user2Request = new CreateUserRequest
        {
            Email = $"user2-{Guid.NewGuid()}@example.com",
            DisplayName = "User 2",
            Password = "TestPassword123!"
        };
        var user2Response = await _client.PostAsJsonAsync("/users", user2Request);
        var user2 = await user2Response.Content.ReadFromJsonAsync<User>();

        // Add memberships
        await _client.PostAsJsonAsync($"/organizations/{org.Id}/memberships", new CreateMembershipRequest { UserId = user1!.Id, Role = OrganizationRole.OrgAdmin });
        await _client.PostAsJsonAsync($"/organizations/{org.Id}/memberships", new CreateMembershipRequest { UserId = user2!.Id, Role = OrganizationRole.Member });

        // Issue equal shares to both users (100 each = 200 total)
        await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-issuances", new CreateShareIssuanceRequest
        {
            UserId = user1.Id,
            ShareTypeId = shareType!.Id,
            Quantity = 100m
        });
        await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-issuances", new CreateShareIssuanceRequest
        {
            UserId = user2.Id,
            ShareTypeId = shareType.Id,
            Quantity = 100m
        });

        // Login as user1
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", new LoginRequest { Email = user1Request.Email, Password = user1Request.Password });
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        _client.AddAuthorizationHeader(loginResult!.Token);

        // Create and open proposal with 60% quorum requirement
        var createRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            CreatedByUserId = user1.Id,
            QuorumRequirement = 60.0m // Require 60% participation
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{org.Id}/proposals", createRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var option1Response = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        var option1 = await option1Response.Content.ReadFromJsonAsync<ProposalOptionDto>();
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Only user1 votes (50% participation, less than 60% required)
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", new CastVoteRequest
        {
            UserId = user1.Id,
            ProposalOptionId = option1!.Id
        });

        // Act - close proposal
        var closeResponse = await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, closeResponse.StatusCode);
        var closedProposal = await closeResponse.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(closedProposal);
        Assert.Equal(ProposalStatus.Closed, closedProposal.Status);
        Assert.False(closedProposal.QuorumMet); // 50% participation fails 60% quorum
        Assert.Equal(100m, closedProposal.TotalVotesCast); // User1's 100 shares
    }

    [Fact]
    public async Task FinalizeProposal_RequiresClosedStatus()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataWithSharesAsync();
        
        // Create proposal (still in Draft)
        var createRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            CreatedByUserId = userId
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", createRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Act - try to finalize Draft proposal (as OrgAdmin)
        var finalizeResponse = await _client.PostAsync($"/proposals/{proposal!.Id}/finalize", null);

        // Assert - should fail because proposal is not Closed
        Assert.Equal(HttpStatusCode.BadRequest, finalizeResponse.StatusCode);
    }

    [Fact]
    public async Task FinalizeProposal_SucceedsForClosedProposal()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataWithSharesAsync();
        
        // Create, open, and close proposal
        var createRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            CreatedByUserId = userId
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", createRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var option1Response = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        var option1 = await option1Response.Content.ReadFromJsonAsync<ProposalOptionDto>();
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);
        
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", new CastVoteRequest
        {
            UserId = userId,
            ProposalOptionId = option1!.Id
        });
        await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        // Act - finalize (as OrgAdmin)
        var finalizeResponse = await _client.PostAsync($"/proposals/{proposal.Id}/finalize", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, finalizeResponse.StatusCode);
        var finalizedProposal = await finalizeResponse.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(finalizedProposal);
        Assert.Equal(ProposalStatus.Finalized, finalizedProposal.Status);
    }

    [Fact]
    public async Task VoteOnProposal_RespectsTimeWindow_BeforeStart()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataWithSharesAsync();
        
        // Create proposal with StartAt in the future
        var createRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            CreatedByUserId = userId,
            StartAt = DateTimeOffset.UtcNow.AddHours(1), // Starts in 1 hour
            EndAt = DateTimeOffset.UtcNow.AddHours(2)
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", createRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var option1Response = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        var option1 = await option1Response.Content.ReadFromJsonAsync<ProposalOptionDto>();
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Act - try to vote before StartAt
        var voteRequest = new CastVoteRequest
        {
            UserId = userId,
            ProposalOptionId = option1!.Id
        };
        var voteResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", voteRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, voteResponse.StatusCode);
        var errorBody = await voteResponse.Content.ReadAsStringAsync();
        Assert.Contains("not started yet", errorBody, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task VoteOnProposal_RespectsTimeWindow_AfterEnd()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataWithSharesAsync();
        
        // Create proposal with EndAt in the past
        var createRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            CreatedByUserId = userId,
            StartAt = DateTimeOffset.UtcNow.AddHours(-2),
            EndAt = DateTimeOffset.UtcNow.AddHours(-1) // Ended 1 hour ago
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", createRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var option1Response = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        var option1 = await option1Response.Content.ReadFromJsonAsync<ProposalOptionDto>();
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Act - try to vote after EndAt
        var voteRequest = new CastVoteRequest
        {
            UserId = userId,
            ProposalOptionId = option1!.Id
        };
        var voteResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", voteRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, voteResponse.StatusCode);
        var errorBody = await voteResponse.Content.ReadAsStringAsync();
        Assert.Contains("ended", errorBody, StringComparison.OrdinalIgnoreCase);
    }
}
