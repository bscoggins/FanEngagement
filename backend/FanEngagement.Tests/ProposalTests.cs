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

public class ProposalTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public ProposalTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    private async Task<(Guid organizationId, Guid userId)> SetupTestDataAsync()
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

        // Login as the created user to get their token for tests
        var loginRequest = new LoginRequest
        {
            Email = userRequest.Email,
            Password = userRequest.Password
        };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        _client.AddAuthorizationHeader(loginResult!.Token);

        return (org.Id, user.Id);
    }

    [Fact]
    public async Task CreateProposal_ReturnsCreated_WithValidRequest()
    {
        // Arrange
        var (orgId, userId) = await SetupTestDataAsync();
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
        if (response.StatusCode != HttpStatusCode.Created)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var proposal = await response.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(proposal);
        Assert.NotEqual(Guid.Empty, proposal!.Id);
        Assert.Equal(orgId, proposal.OrganizationId);
        Assert.Equal("Test Proposal", proposal.Title);
        Assert.Equal(ProposalStatus.Draft, proposal.Status);  // Changed from Open to Draft
        Assert.Equal(userId, proposal.CreatedByUserId);
    }

    [Fact]
    public async Task CreateProposal_ReturnsBadRequest_WhenOrganizationDoesNotExist()
    {
        // Arrange
        var (_, userId) = await SetupTestDataAsync();
        
        // Use admin token to attempt creating in non-existent org
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);
        
        var request = new CreateProposalRequest
        {
            Title = "Test Proposal",
            CreatedByUserId = userId
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{Guid.NewGuid()}/proposals", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateProposal_ReturnsBadRequest_WhenUserDoesNotExist()
    {
        // Arrange
        var (orgId, _) = await SetupTestDataAsync();
        var request = new CreateProposalRequest
        {
            Title = "Test Proposal",
            CreatedByUserId = Guid.NewGuid()
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetProposalsByOrganization_ReturnsListOfProposals()
    {
        // Arrange
        var (orgId, userId) = await SetupTestDataAsync();

        var request1 = new CreateProposalRequest
        {
            Title = "Proposal 1",
            CreatedByUserId = userId
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", request1);

        var request2 = new CreateProposalRequest
        {
            Title = "Proposal 2",
            CreatedByUserId = userId
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", request2);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/proposals");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var proposals = await response.Content.ReadFromJsonAsync<List<ProposalDto>>();
        Assert.NotNull(proposals);
        Assert.True(proposals!.Count >= 2);
    }

    [Fact]
    public async Task GetProposalById_ReturnsProposalWithOptions()
    {
        // Arrange
        var (orgId, userId) = await SetupTestDataAsync();

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test description",
            CreatedByUserId = userId
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add options
        var option1Request = new AddProposalOptionRequest { Text = "Option 1" };
        await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", option1Request);

        var option2Request = new AddProposalOptionRequest { Text = "Option 2" };
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", option2Request);

        // Act
        var response = await _client.GetAsync($"/proposals/{proposal.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var proposalDetails = await response.Content.ReadFromJsonAsync<ProposalDetailsDto>();
        Assert.NotNull(proposalDetails);
        Assert.Equal(proposal.Id, proposalDetails!.Id);
        Assert.Equal("Test Proposal", proposalDetails.Title);
        Assert.Equal(2, proposalDetails.Options.Count);
    }

    [Fact]
    public async Task GetProposalById_ReturnsNotFound_WhenProposalDoesNotExist()
    {
        // Arrange - use admin token since non-existent proposal can't verify org membership
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);
        
        // Act - try to get non-existent proposal
        var response = await _client.GetAsync($"/proposals/{Guid.NewGuid()}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProposal_UpdatesFields_WhenInOpenState()
    {
        // Arrange
        var (orgId, userId) = await SetupTestDataAsync();

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Original Title",
            Description = "Original description",
            CreatedByUserId = userId
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var updateRequest = new UpdateProposalRequest
        {
            Title = "Updated Title",
            Description = "Updated description"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/proposals/{proposal!.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(updated);
        Assert.Equal("Updated Title", updated!.Title);
        Assert.Equal("Updated description", updated.Description);
    }

    [Fact]
    public async Task UpdateProposal_ReturnsBadRequest_WhenProposalIsClosed()
    {
        // Arrange
        var (orgId, userId) = await SetupTestDataAsync();

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            CreatedByUserId = userId
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add options and open the proposal
        await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Close the proposal
        await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        var updateRequest = new UpdateProposalRequest { Title = "Updated Title" };

        // Act
        var response = await _client.PutAsJsonAsync($"/proposals/{proposal.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AddOption_AddsOptionToProposal()
    {
        // Arrange
        var (orgId, userId) = await SetupTestDataAsync();

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            CreatedByUserId = userId
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var optionRequest = new AddProposalOptionRequest
        {
            Text = "Option 1",
            Description = "First option"
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", optionRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var option = await response.Content.ReadFromJsonAsync<ProposalOptionDto>();
        Assert.NotNull(option);
        Assert.NotEqual(Guid.Empty, option!.Id);
        Assert.Equal(proposal.Id, option.ProposalId);
        Assert.Equal("Option 1", option.Text);
    }

    [Fact]
    public async Task AddOption_ReturnsBadRequest_WhenProposalIsClosed()
    {
        // Arrange
        var (orgId, userId) = await SetupTestDataAsync();

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            CreatedByUserId = userId
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add options and open the proposal
        await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Close the proposal
        await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        var optionRequest = new AddProposalOptionRequest { Text = "New Option" };

        // Act
        var response = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", optionRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeleteOption_RemovesOption_WhenInDraftState()
    {
        // Arrange
        var (orgId, userId) = await SetupTestDataAsync();

        // Create a proposal in Draft state
        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            CreatedByUserId = userId
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var optionRequest = new AddProposalOptionRequest { Text = "Option 1" };
        var optionResponse = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", optionRequest);
        var option = await optionResponse.Content.ReadFromJsonAsync<ProposalOptionDto>();

        // Act - This should succeed because we're in Draft state
        var response = await _client.DeleteAsync($"/proposals/{proposal.Id}/options/{option!.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task CloseProposal_ChangesStatusToClosed()
    {
        // Arrange
        var (orgId, userId) = await SetupTestDataAsync();

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            CreatedByUserId = userId
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add options and open the proposal
        await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Act
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var closed = await response.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(closed);
        Assert.Equal(ProposalStatus.Closed, closed!.Status);
    }

    [Fact]
    public async Task CloseProposal_ReturnsBadRequest_WhenAlreadyClosed()
    {
        // Arrange
        var (orgId, userId) = await SetupTestDataAsync();

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            CreatedByUserId = userId
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add options and open the proposal
        await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Close the proposal once
        await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        // Act - Try to close again
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetProposalsByOrganization_ReturnsOnlyForSpecifiedOrganization()
    {
        // Arrange - Create two organizations with proposals
        // First org and user
        var (org1Id, user1Id) = await SetupTestDataAsync();

        var request1 = new CreateProposalRequest
        {
            Title = "Org 1 Proposal",
            CreatedByUserId = user1Id
        };
        await _client.PostAsJsonAsync($"/organizations/{org1Id}/proposals", request1);

        // Second org and user (need admin to create org, then add user as member)
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);
        
        var org2Request = new CreateOrganizationRequest
        {
            Name = $"Test Organization {Guid.NewGuid()}",
            Description = "Test Organization"
        };
        var org2Response = await _client.PostAsJsonAsync("/organizations", org2Request);
        var org2 = await org2Response.Content.ReadFromJsonAsync<Organization>();
        var org2Id = org2!.Id;

        // Create second user
        var user2Request = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User 2",
            Password = "TestPassword123!"
        };
        var user2Response = await _client.PostAsJsonAsync("/users", user2Request);
        var user2 = await user2Response.Content.ReadFromJsonAsync<User>();
        var user2Id = user2!.Id;

        // Add user2 to org2 with OrgAdmin role
        var membership2Request = new CreateMembershipRequest
        {
            UserId = user2Id,
            Role = OrganizationRole.OrgAdmin
        };
        await _client.PostAsJsonAsync($"/organizations/{org2Id}/memberships", membership2Request);

        // Login as user2 to create proposal in org2
        var login2Request = new LoginRequest
        {
            Email = user2Request.Email,
            Password = user2Request.Password
        };
        var login2Response = await _client.PostAsJsonAsync("/auth/login", login2Request);
        var login2Result = await login2Response.Content.ReadFromJsonAsync<LoginResponse>();
        _client.AddAuthorizationHeader(login2Result!.Token);

        var request2 = new CreateProposalRequest
        {
            Title = "Org 2 Proposal",
            CreatedByUserId = user2Id
        };
        await _client.PostAsJsonAsync($"/organizations/{org2Id}/proposals", request2);

        // Use admin token to query org1 proposals (admin can access all orgs)
        _client.AddAuthorizationHeader(adminToken);

        // Act - Get proposals for org1
        var response = await _client.GetAsync($"/organizations/{org1Id}/proposals");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var proposals = await response.Content.ReadFromJsonAsync<List<ProposalDto>>();
        Assert.NotNull(proposals);
        Assert.All(proposals!, p => Assert.Equal(org1Id, p.OrganizationId));
    }
}
