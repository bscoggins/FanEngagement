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
/// Integration tests verifying multi-tenancy enforcement.
/// Tests ensure users in Organization A cannot access or mutate resources in Organization B.
/// </summary>
public class MultiTenancyTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public MultiTenancyTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task UserInOrgA_CannotAccessProposalInOrgB()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create two separate organizations
        var orgA = await CreateOrganizationAsync("Organization A");
        var orgB = await CreateOrganizationAsync("Organization B");

        // Create users in each org
        var (_, userAToken) = await CreateUserInOrgAsync(orgA.Id);
        var (userB, _) = await CreateUserInOrgAsync(orgB.Id);

        // Create proposal in OrgB
        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(orgB.Id, userB.Id);

        // Act - UserA tries to access proposal in OrgB
        _client.AddAuthorizationHeader(userAToken);
        var response = await _client.GetAsync($"/proposals/{proposal.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UserInOrgA_CannotVoteOnProposalInOrgB()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create two orgs with share types
        var orgA = await CreateOrganizationAsync("Organization A");
        var orgB = await CreateOrganizationAsync("Organization B");

        var shareTypeA = await CreateShareTypeAsync(orgA.Id);
        var shareTypeB = await CreateShareTypeAsync(orgB.Id);

        // Create users and issue shares
        var (userA, userAToken) = await CreateUserWithSharesAsync(orgA.Id, shareTypeA.Id, 100m);
        var (userB, _) = await CreateUserWithSharesAsync(orgB.Id, shareTypeB.Id, 100m);

        // Create and open proposal in OrgB
        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(orgB.Id, userB.Id);
        var option = await AddOptionAsync(proposal.Id, "Option 1");
        await AddOptionAsync(proposal.Id, "Option 2");
        await OpenProposalAsync(proposal.Id);

        // Act - UserA tries to vote on OrgB's proposal
        _client.AddAuthorizationHeader(userAToken);
        var response = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", new CastVoteRequest
        {
            UserId = userA.Id,
            ProposalOptionId = option.Id
        });

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UserInOrgA_CannotAccessShareTypesInOrgB()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgA = await CreateOrganizationAsync("Organization A");
        var orgB = await CreateOrganizationAsync("Organization B");

        var (_, userAToken) = await CreateUserInOrgAsync(orgA.Id);
        await CreateShareTypeAsync(orgB.Id);

        // Act - UserA tries to access OrgB's share types
        _client.AddAuthorizationHeader(userAToken);
        var response = await _client.GetAsync($"/organizations/{orgB.Id}/share-types");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UserInOrgA_CannotListMembershipsInOrgB()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgA = await CreateOrganizationAsync("Organization A");
        var orgB = await CreateOrganizationAsync("Organization B");

        var (_, userAToken) = await CreateUserInOrgAsync(orgA.Id);

        // Act - UserA tries to list memberships in OrgB
        _client.AddAuthorizationHeader(userAToken);
        var response = await _client.GetAsync($"/organizations/{orgB.Id}/memberships");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UserInOrgA_CannotViewOrgBDetails()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgA = await CreateOrganizationAsync("Organization A");
        var orgB = await CreateOrganizationAsync("Organization B");

        var (_, userAToken) = await CreateUserInOrgAsync(orgA.Id);

        // Act - UserA tries to view OrgB details
        _client.AddAuthorizationHeader(userAToken);
        var response = await _client.GetAsync($"/organizations/{orgB.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GlobalAdmin_CanAccessAllOrganizations()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgA = await CreateOrganizationAsync("Organization A");
        var orgB = await CreateOrganizationAsync("Organization B");

        // Act - Admin can access both
        var responseA = await _client.GetAsync($"/organizations/{orgA.Id}");
        var responseB = await _client.GetAsync($"/organizations/{orgB.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, responseA.StatusCode);
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
    }

    [Fact]
    public async Task GlobalAdmin_CanAccessProposalsInAnyOrg()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgA = await CreateOrganizationAsync("Organization A");
        var orgB = await CreateOrganizationAsync("Organization B");

        var (userA, _) = await CreateUserInOrgAsync(orgA.Id);
        var (userB, _) = await CreateUserInOrgAsync(orgB.Id);

        var proposalA = await CreateProposalAsync(orgA.Id, userA.Id);
        var proposalB = await CreateProposalAsync(orgB.Id, userB.Id);

        // Act - Admin can access proposals in both orgs
        var responseA = await _client.GetAsync($"/proposals/{proposalA.Id}");
        var responseB = await _client.GetAsync($"/proposals/{proposalB.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, responseA.StatusCode);
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
    }

    [Fact]
    public async Task OrgAdminInOrgA_CannotModifyOrgB()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgA = await CreateOrganizationAsync("Organization A");
        var orgB = await CreateOrganizationAsync("Organization B");

        var (_, orgAdminAToken) = await CreateOrgAdminAsync(orgA.Id);

        // Act - OrgAdmin of OrgA tries to update OrgB
        _client.AddAuthorizationHeader(orgAdminAToken);
        var response = await _client.PutAsJsonAsync($"/organizations/{orgB.Id}", new UpdateOrganizationRequest
        {
            Name = "Hacked Organization"
        });

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task OrgMember_CanAccessOwnOrgResources()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var org = await CreateOrganizationAsync("Test Organization");
        var shareType = await CreateShareTypeAsync(org.Id);
        var (user, userToken) = await CreateUserWithSharesAsync(org.Id, shareType.Id, 100m);

        var proposal = await CreateProposalAsync(org.Id, user.Id);

        // Act - Member can access their own org's resources
        _client.AddAuthorizationHeader(userToken);
        
        var orgResponse = await _client.GetAsync($"/organizations/{org.Id}");
        var proposalResponse = await _client.GetAsync($"/proposals/{proposal.Id}");
        var shareTypesResponse = await _client.GetAsync($"/organizations/{org.Id}/share-types");
        var membershipsResponse = await _client.GetAsync($"/organizations/{org.Id}/memberships");

        // Assert
        Assert.Equal(HttpStatusCode.OK, orgResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, proposalResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, shareTypesResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, membershipsResponse.StatusCode);
    }

    [Fact]
    public async Task MemberWithoutShares_CannotVote()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var org = await CreateOrganizationAsync("Test Organization");
        var shareType = await CreateShareTypeAsync(org.Id);

        // Create member WITHOUT shares
        var (memberWithoutShares, memberToken) = await CreateUserInOrgAsync(org.Id);
        
        // Create member WITH shares to create proposal
        var (memberWithShares, _) = await CreateUserWithSharesAsync(org.Id, shareType.Id, 100m);

        // Create and open proposal
        _client.AddAuthorizationHeader(adminToken);
        var proposal = await CreateProposalAsync(org.Id, memberWithShares.Id);
        var option = await AddOptionAsync(proposal.Id, "Option 1");
        await AddOptionAsync(proposal.Id, "Option 2");
        await OpenProposalAsync(proposal.Id);

        // Act - Member without shares tries to vote
        _client.AddAuthorizationHeader(memberToken);
        var response = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", new CastVoteRequest
        {
            UserId = memberWithoutShares.Id,
            ProposalOptionId = option.Id
        });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadAsStringAsync();
        Assert.Contains("no voting power", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task NonMember_CannotCreateProposalInOrg()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var org = await CreateOrganizationAsync("Test Organization");

        // Create user who is NOT a member of the org
        var (nonMember, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);

        // Act - Non-member tries to create proposal
        _client.AddAuthorizationHeader(nonMemberToken);
        var response = await _client.PostAsJsonAsync($"/organizations/{org.Id}/proposals", new CreateProposalRequest
        {
            Title = "Unauthorized Proposal",
            CreatedByUserId = nonMember.Id
        });

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    #region Helper Methods

    private async Task<Organization> CreateOrganizationAsync(string name)
    {
        var request = new CreateOrganizationRequest
        {
            Name = $"{name} {Guid.NewGuid()}",
            Description = name
        };
        var response = await _client.PostAsJsonAsync("/organizations", request);
        return (await response.Content.ReadFromJsonAsync<Organization>())!;
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

    private async Task<(UserDto user, string token)> CreateUserInOrgAsync(Guid orgId)
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

        var loginResponse = await _client.PostAsJsonAsync("/auth/login", new { Email = userRequest.Email, Password = password });
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<FanEngagement.Application.Authentication.LoginResponse>();

        return (user, loginResult!.Token);
    }

    private async Task<(UserDto user, string token)> CreateOrgAdminAsync(Guid orgId)
    {
        var password = "TestPassword123!";
        var userRequest = new CreateUserRequest
        {
            Email = $"orgadmin-{Guid.NewGuid()}@test.com",
            DisplayName = "Org Admin",
            Password = password
        };
        var userResponse = await _client.PostAsJsonAsync("/users", userRequest);
        var user = await userResponse.Content.ReadFromJsonAsync<UserDto>();

        var membershipRequest = new CreateMembershipRequest
        {
            UserId = user!.Id,
            Role = OrganizationRole.OrgAdmin
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", membershipRequest);

        var loginResponse = await _client.PostAsJsonAsync("/auth/login", new { Email = userRequest.Email, Password = password });
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<FanEngagement.Application.Authentication.LoginResponse>();

        return (user, loginResult!.Token);
    }

    private async Task<(UserDto user, string token)> CreateUserWithSharesAsync(Guid orgId, Guid shareTypeId, decimal shares)
    {
        var (user, token) = await CreateUserInOrgAsync(orgId);
        await IssueSharesAsync(orgId, user.Id, shareTypeId, shares);
        return (user, token);
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
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request);
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

    private async Task<ProposalOptionDto> AddOptionAsync(Guid proposalId, string text)
    {
        var request = new AddProposalOptionRequest { Text = text };
        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/options", request);
        return (await response.Content.ReadFromJsonAsync<ProposalOptionDto>())!;
    }

    private async Task<ProposalDto> OpenProposalAsync(Guid proposalId)
    {
        var response = await _client.PostAsync($"/proposals/{proposalId}/open", null);
        return (await response.Content.ReadFromJsonAsync<ProposalDto>())!;
    }

    #endregion
}
