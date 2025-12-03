using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Proposals;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;

namespace FanEngagement.Tests;

public class AuthorizationIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public AuthorizationIntegrationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(Guid OrgId, Guid AdminUserId, string AdminToken, Guid MemberUserId, string MemberToken)> CreateOrgWithUsersAsync()
    {
        // Create organization as admin
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgRequest = new CreateOrganizationRequest { Name = "Test Organization" };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();

        // Create a regular user
        var memberPassword = "MemberPass123!";
        var memberRequest = new CreateUserRequest
        {
            Email = $"member-{Guid.NewGuid()}@example.com",
            DisplayName = "Member User",
            Password = memberPassword
        };

        _client.DefaultRequestHeaders.Remove("Authorization");
        var memberCreateResponse = await _client.PostAsJsonAsync("/users", memberRequest);
        var member = await memberCreateResponse.Content.ReadFromJsonAsync<UserDto>();

        var memberLoginRequest = new LoginRequest
        {
            Email = memberRequest.Email,
            Password = memberPassword
        };

        var memberLoginResponse = await _client.PostAsJsonAsync("/auth/login", memberLoginRequest);
        var memberLoginResult = await memberLoginResponse.Content.ReadFromJsonAsync<LoginResponse>();

        // Add both admin and member to organization with appropriate roles
        _client.AddAuthorizationHeader(adminToken);
        
        var adminMembershipRequest = new CreateMembershipRequest
        {
            UserId = adminUserId,
            Role = OrganizationRole.OrgAdmin
        };
        await _client.PostAsJsonAsync($"/organizations/{org!.Id}/memberships", adminMembershipRequest);

        var memberMembershipRequest = new CreateMembershipRequest
        {
            UserId = member!.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{org.Id}/memberships", memberMembershipRequest);

        _client.DefaultRequestHeaders.Remove("Authorization");

        return (org.Id, adminUserId, adminToken, member.Id, memberLoginResult!.Token);
    }

    #region User Management Authorization Tests

    [Fact]
    public async Task GetAllUsers_ReturnsOk_ForGlobalAdmin()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.GetAsync("/users");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAllUsers_ReturnsForbidden_ForRegularUser()
    {
        // Arrange
        var (_, regularToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(regularToken);

        // Act
        var response = await _client.GetAsync("/users");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUser_ReturnsForbidden_ForRegularUser()
    {
        // Arrange
        var (user, regularToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(regularToken);

        var updateRequest = new UpdateUserRequest
        {
            DisplayName = "Updated Name"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{user.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateUser_ReturnsOk_ForGlobalAdmin()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var updateRequest = new UpdateUserRequest
        {
            Email = $"updated-{Guid.NewGuid()}@example.com",
            DisplayName = "Updated Name"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{user.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetUserById_ReturnsOk_ForGlobalAdmin()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.GetAsync($"/users/{user.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetUserById_ReturnsForbidden_ForRegularUser()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (otherUser, otherToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(otherToken);

        // Act
        var response = await _client.GetAsync($"/users/{user.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_ReturnsNoContent_ForGlobalAdmin()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.DeleteAsync($"/users/{user.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_ReturnsForbidden_ForRegularUser()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (otherUser, otherToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(otherToken);

        // Act
        var response = await _client.DeleteAsync($"/users/{user.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetMyOrganizations_ReturnsOk_ForAuthenticatedUser()
    {
        // Arrange
        var (_, userToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(userToken);

        // Act
        var response = await _client.GetAsync("/users/me/organizations");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetUserMemberships_ReturnsOk_ForSelf()
    {
        // Arrange
        var (user, userToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(userToken);

        // Act
        var response = await _client.GetAsync($"/users/{user.Id}/memberships");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetUserMemberships_ReturnsOk_ForGlobalAdmin()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.GetAsync($"/users/{user.Id}/memberships");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetUserMemberships_ReturnsForbidden_ForOtherUser()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (otherUser, otherToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(otherToken);

        // Act
        var response = await _client.GetAsync($"/users/{user.Id}/memberships");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    #endregion

    #region Organization Authorization Tests

    [Fact]
    public async Task CreateOrganization_ReturnsForbidden_ForRegularUser()
    {
        // Arrange
        var (_, regularToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(regularToken);

        var orgRequest = new CreateOrganizationRequest { Name = "Test Org" };

        // Act
        var response = await _client.PostAsJsonAsync("/organizations", orgRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreateOrganization_ReturnsCreated_ForGlobalAdmin()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgRequest = new CreateOrganizationRequest { Name = "Test Org" };

        // Act
        var response = await _client.PostAsJsonAsync("/organizations", orgRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task GetOrganizationById_ReturnsOk_ForOrgMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetOrganizationById_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, _, _) = await CreateOrgWithUsersAsync();
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateOrganization_ReturnsOk_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        var updateRequest = new UpdateOrganizationRequest
        {
            Name = "Updated Org Name"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{orgId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateOrganization_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var updateRequest = new UpdateOrganizationRequest
        {
            Name = "Updated Org Name"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{orgId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    #endregion

    #region Membership Authorization Tests

    [Fact]
    public async Task AddMembership_ReturnsCreated_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        var (newUser, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(adminToken);

        var membershipRequest = new CreateMembershipRequest
        {
            UserId = newUser.Id,
            Role = OrganizationRole.Member
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", membershipRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AddMembership_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        var (newUser, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(memberToken);

        var membershipRequest = new CreateMembershipRequest
        {
            UserId = newUser.Id,
            Role = OrganizationRole.Member
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", membershipRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ListMemberships_ReturnsOk_ForOrgMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/memberships");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAvailableUsers_ReturnsOk_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/memberships/available-users");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAvailableUsers_ReturnsOk_ForGlobalAdmin()
    {
        // Arrange
        var (_, globalAdminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(globalAdminToken);

        // Create an organization
        var orgRequest = new CreateOrganizationRequest { Name = "Test Organization" };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();

        // Act
        var response = await _client.GetAsync($"/organizations/{org!.Id}/memberships/available-users");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAvailableUsers_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/memberships/available-users");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAvailableUsers_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, _, _) = await CreateOrgWithUsersAsync();
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/memberships/available-users");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAvailableUsers_ReturnsUsersNotAlreadyMembers()
    {
        // Arrange
        var (orgId, adminUserId, adminToken, _, _) = await CreateOrgWithUsersAsync();
        
        // Create an additional user who is NOT a member of the org
        var (nonMemberUser, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/memberships/available-users");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var availableUsers = await response.Content.ReadFromJsonAsync<List<UserDto>>();
        Assert.NotNull(availableUsers);
        
        // The non-member user should be in the available users list
        Assert.Contains(availableUsers, u => u.Id == nonMemberUser.Id);
        
        // The admin user (who is a member) should NOT be in the available users list
        Assert.DoesNotContain(availableUsers, u => u.Id == adminUserId);
    }

    [Fact]
    public async Task GetMembershipByUser_ReturnsOk_ForOrgMember()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/memberships/{memberId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetMembershipByUser_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, memberId, _) = await CreateOrgWithUsersAsync();
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/memberships/{memberId}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteMembership_ReturnsNoContent_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, memberId, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.DeleteAsync($"/organizations/{orgId}/memberships/{memberId}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteMembership_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, adminToken, _, memberToken) = await CreateOrgWithUsersAsync();
        
        // Create another member to delete
        var (newUser, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(adminToken);
        var newMembershipRequest = new CreateMembershipRequest
        {
            UserId = newUser.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", newMembershipRequest);

        // Switch to regular member trying to delete
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.DeleteAsync($"/organizations/{orgId}/memberships/{newUser.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    #endregion

    #region ShareType Authorization Tests

    [Fact]
    public async Task CreateShareType_ReturnsCreated_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Share",
            Symbol = "TST",
            VotingWeight = 1.0m
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareTypeRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateShareType_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Share",
            Symbol = "TST",
            VotingWeight = 1.0m
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareTypeRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetShareTypes_ReturnsOk_ForOrgMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/share-types");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetShareTypeById_ReturnsOk_ForOrgMember()
    {
        // Arrange
        var (orgId, _, adminToken, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a share type first
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Share",
            Symbol = "TST",
            VotingWeight = 1.0m
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareTypeRequest);
        var shareType = await createResponse.Content.ReadFromJsonAsync<ShareType>();

        // Switch to member token
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/share-types/{shareType.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetShareTypeById_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a share type first
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Share",
            Symbol = "TST",
            VotingWeight = 1.0m
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareTypeRequest);
        var shareType = await createResponse.Content.ReadFromJsonAsync<ShareType>();

        // Switch to non-member
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/share-types/{shareType.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateShareType_ReturnsOk_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a share type first
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Share",
            Symbol = "TST",
            VotingWeight = 1.0m
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareTypeRequest);
        var shareType = await createResponse.Content.ReadFromJsonAsync<ShareType>();

        var updateRequest = new Application.ShareTypes.UpdateShareTypeRequest
        {
            Name = "Updated Share",
            Symbol = "UPD",
            VotingWeight = 2.0m
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{orgId}/share-types/{shareType.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateShareType_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, adminToken, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a share type first
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Share",
            Symbol = "TST",
            VotingWeight = 1.0m
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareTypeRequest);
        var shareType = await createResponse.Content.ReadFromJsonAsync<ShareType>();

        // Switch to member token
        _client.AddAuthorizationHeader(memberToken);

        var updateRequest = new Application.ShareTypes.UpdateShareTypeRequest
        {
            Name = "Updated Share",
            Symbol = "UPD",
            VotingWeight = 2.0m
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{orgId}/share-types/{shareType.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    #endregion

    #region ShareIssuance Authorization Tests

    [Fact]
    public async Task CreateShareIssuance_ReturnsCreated_ForOrgAdmin()
    {
        // Arrange
        var (orgId, adminUserId, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a share type first
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Share",
            Symbol = "TST",
            VotingWeight = 1.0m
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareTypeRequest);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();

        var issuanceRequest = new Application.ShareIssuances.CreateShareIssuanceRequest
        {
            ShareTypeId = shareType!.Id,
            UserId = adminUserId,
            Quantity = 100,
            Reason = "Test issuance"
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", issuanceRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, adminToken, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a share type first
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Share",
            Symbol = "TST",
            VotingWeight = 1.0m
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareTypeRequest);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();

        // Switch to member token
        _client.AddAuthorizationHeader(memberToken);

        var issuanceRequest = new Application.ShareIssuances.CreateShareIssuanceRequest
        {
            ShareTypeId = shareType!.Id,
            UserId = memberId,
            Quantity = 100,
            Reason = "Test issuance"
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", issuanceRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        var (nonMember, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(adminToken);

        // Create a share type first
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Share",
            Symbol = "TST",
            VotingWeight = 1.0m
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareTypeRequest);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();

        // Switch to non-member token
        _client.AddAuthorizationHeader(nonMemberToken);

        var issuanceRequest = new Application.ShareIssuances.CreateShareIssuanceRequest
        {
            ShareTypeId = shareType!.Id,
            UserId = nonMember.Id,
            Quantity = 100,
            Reason = "Test issuance"
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", issuanceRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetShareIssuancesByOrganization_ReturnsOk_ForOrgMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/share-issuances");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetShareIssuancesByOrganization_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, _, _) = await CreateOrgWithUsersAsync();
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/share-issuances");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetShareIssuancesByUser_ReturnsOk_ForOrgMember()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/users/{memberId}/share-issuances");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetShareIssuancesByUser_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, memberId, _) = await CreateOrgWithUsersAsync();
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/users/{memberId}/share-issuances");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetShareBalances_ReturnsOk_ForOrgMember()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/users/{memberId}/balances");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetShareBalances_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, memberId, _) = await CreateOrgWithUsersAsync();
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/users/{memberId}/balances");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    #endregion

    #region Proposal Authorization Tests

    [Fact]
    public async Task CreateProposal_ReturnsCreated_ForOrgMember()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateProposal_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, _, _) = await CreateOrgWithUsersAsync();
        var (nonMember, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = nonMember.Id,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProposal_ReturnsOk_ForProposalCreator()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var updateRequest = new UpdateProposalRequest
        {
            Title = "Updated Title",
            Description = "Updated Description"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/proposals/{proposal.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProposal_ReturnsOk_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Switch to admin token
        _client.AddAuthorizationHeader(adminToken);

        var updateRequest = new UpdateProposalRequest
        {
            Title = "Updated Title",
            Description = "Updated Description"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/proposals/{proposal.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProposal_ReturnsForbidden_ForNonCreatorRegularMember()
    {
        // Arrange
        var (orgId, _, adminToken, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Create another member who is not the creator
        _client.DefaultRequestHeaders.Remove("Authorization");
        var (newMember, newMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        // Add new member to org using OrgAdmin token
        _client.AddAuthorizationHeader(adminToken);
        var newMembershipRequest = new CreateMembershipRequest
        {
            UserId = newMember.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", newMembershipRequest);

        // Now try to update as the new member (not creator)
        _client.AddAuthorizationHeader(newMemberToken);

        var updateRequest = new UpdateProposalRequest
        {
            Title = "Updated Title",
            Description = "Updated Description"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/proposals/{proposal.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetProposal_ReturnsOk_ForOrgMember()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Act
        var response = await _client.GetAsync($"/proposals/{proposal.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetProposal_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Try to access as non-member
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        // Act
        var response = await _client.GetAsync($"/proposals/{proposal.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetProposalsByOrganization_ReturnsOk_ForOrgMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/proposals");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetProposalsByOrganization_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, _, _) = await CreateOrgWithUsersAsync();
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/proposals");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task OpenProposal_ReturnsOk_ForProposalCreator()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add required options (minimum 2)
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });

        // Act
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task OpenProposal_ReturnsOk_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add required options (minimum 2)
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });

        // Switch to admin token
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task OpenProposal_ReturnsForbidden_ForNonCreatorRegularMember()
    {
        // Arrange
        var (orgId, _, adminToken, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add required options (minimum 2)
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });

        // Create another member who is not the creator
        _client.DefaultRequestHeaders.Remove("Authorization");
        var (newMember, newMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        // Add new member to org using OrgAdmin token
        _client.AddAuthorizationHeader(adminToken);
        var newMembershipRequest = new CreateMembershipRequest
        {
            UserId = newMember.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", newMembershipRequest);

        // Now try to open as the new member (not creator)
        _client.AddAuthorizationHeader(newMemberToken);

        // Act
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CloseProposal_ReturnsOk_ForProposalCreator()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add required options (minimum 2)
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });

        // Open the proposal first
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Act
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CloseProposal_ReturnsForbidden_ForNonCreatorRegularMember()
    {
        // Arrange
        var (orgId, _, adminToken, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add required options (minimum 2)
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 1" });
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option 2" });

        // Open the proposal
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Create another member who is not the creator
        _client.DefaultRequestHeaders.Remove("Authorization");
        var (newMember, newMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        // Add new member to org using OrgAdmin token
        _client.AddAuthorizationHeader(adminToken);
        var newMembershipRequest = new CreateMembershipRequest
        {
            UserId = newMember.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", newMembershipRequest);

        // Now try to close as the new member (not creator)
        _client.AddAuthorizationHeader(newMemberToken);

        // Act
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AddProposalOption_ReturnsCreated_ForProposalCreator()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var optionRequest = new AddProposalOptionRequest
        {
            Text = "Test Option"
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", optionRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AddProposalOption_ReturnsForbidden_ForNonCreatorRegularMember()
    {
        // Arrange
        var (orgId, _, adminToken, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Create another member who is not the creator
        _client.DefaultRequestHeaders.Remove("Authorization");
        var (newMember, newMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        // Add new member to org using OrgAdmin token
        _client.AddAuthorizationHeader(adminToken);
        var newMembershipRequest = new CreateMembershipRequest
        {
            UserId = newMember.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", newMembershipRequest);

        // Now try to add option as the new member (not creator)
        _client.AddAuthorizationHeader(newMemberToken);

        var optionRequest = new AddProposalOptionRequest
        {
            Text = "Test Option"
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", optionRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteProposalOption_ReturnsNoContent_ForProposalCreator()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var optionRequest = new AddProposalOptionRequest
        {
            Text = "Test Option"
        };

        var optionResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", optionRequest);
        var option = await optionResponse.Content.ReadFromJsonAsync<ProposalOptionDto>();

        // Act
        var response = await _client.DeleteAsync($"/proposals/{proposal.Id}/options/{option.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteProposalOption_ReturnsForbidden_ForNonCreatorRegularMember()
    {
        // Arrange
        var (orgId, _, adminToken, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        var optionRequest = new AddProposalOptionRequest
        {
            Text = "Test Option"
        };

        var optionResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", optionRequest);
        var option = await optionResponse.Content.ReadFromJsonAsync<ProposalOptionDto>();

        // Create another member who is not the creator
        _client.DefaultRequestHeaders.Remove("Authorization");
        var (newMember, newMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        // Add new member to org using OrgAdmin token
        _client.AddAuthorizationHeader(adminToken);
        var newMembershipRequest = new CreateMembershipRequest
        {
            UserId = newMember.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", newMembershipRequest);

        // Now try to delete option as the new member (not creator)
        _client.AddAuthorizationHeader(newMemberToken);

        // Act
        var response = await _client.DeleteAsync($"/proposals/{proposal.Id}/options/{option.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetProposalResults_ReturnsOk_ForOrgMember()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Act
        var response = await _client.GetAsync($"/proposals/{proposal.Id}/results");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetProposalResults_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Try to access as non-member
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        // Act
        var response = await _client.GetAsync($"/proposals/{proposal.Id}/results");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetUserVote_ReturnsOkOrNotFound_ForSelf()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Act
        var response = await _client.GetAsync($"/proposals/{proposal.Id}/votes/{memberId}");

        // Assert - NotFound is OK since no vote was cast, Forbidden would be authorization failure
        Assert.True(response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetUserVote_ReturnsOkOrNotFound_ForGlobalAdmin()
    {
        // Arrange
        var (orgId, _, _, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Switch to global admin
        var (_, globalAdminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(globalAdminToken);

        // Act
        var response = await _client.GetAsync($"/proposals/{proposal.Id}/votes/{memberId}");

        // Assert - NotFound is OK since no vote was cast, Forbidden would be authorization failure
        Assert.True(response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetUserVote_ReturnsForbidden_ForOtherUser()
    {
        // Arrange
        var (orgId, _, adminToken, memberId, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
            CreatedByUserId = memberId,
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };

        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Create another member who is not the voter
        _client.DefaultRequestHeaders.Remove("Authorization");
        var (newMember, newMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        // Add new member to org using OrgAdmin token
        _client.AddAuthorizationHeader(adminToken);
        var newMembershipRequest = new CreateMembershipRequest
        {
            UserId = newMember.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", newMembershipRequest);

        // Now try to view memberId's vote as the new member
        _client.AddAuthorizationHeader(newMemberToken);

        // Act
        var response = await _client.GetAsync($"/proposals/{proposal.Id}/votes/{memberId}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    #endregion

    #region Webhook Authorization Tests

    [Fact]
    public async Task CreateWebhook_ReturnsCreated_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        var webhookRequest = new Application.WebhookEndpoints.CreateWebhookEndpointRequest("https://example.com/webhook", "test-secret-at-least-16-chars", new List<string> { "proposal.created" });

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/webhooks", webhookRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task CreateWebhook_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        var webhookRequest = new Application.WebhookEndpoints.CreateWebhookEndpointRequest("https://example.com/webhook", "test-secret-at-least-16-chars", new List<string> { "proposal.created" });

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/webhooks", webhookRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreateWebhook_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, _, _) = await CreateOrgWithUsersAsync();
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        var webhookRequest = new Application.WebhookEndpoints.CreateWebhookEndpointRequest("https://example.com/webhook", "test-secret-at-least-16-chars", new List<string> { "proposal.created" });

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/webhooks", webhookRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAllWebhooks_ReturnsOk_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/webhooks");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAllWebhooks_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/webhooks");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetWebhookById_ReturnsOk_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a webhook first
        var webhookRequest = new Application.WebhookEndpoints.CreateWebhookEndpointRequest("https://example.com/webhook", "test-secret-at-least-16-chars", new List<string> { "proposal.created" });
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/webhooks", webhookRequest);
        var webhook = await createResponse.Content.ReadFromJsonAsync<Application.WebhookEndpoints.WebhookEndpointDto>();

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/webhooks/{webhook.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetWebhookById_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, adminToken, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a webhook first
        var webhookRequest = new Application.WebhookEndpoints.CreateWebhookEndpointRequest("https://example.com/webhook", "test-secret-at-least-16-chars", new List<string> { "proposal.created" });
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/webhooks", webhookRequest);
        var webhook = await createResponse.Content.ReadFromJsonAsync<Application.WebhookEndpoints.WebhookEndpointDto>();

        // Switch to member token
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/webhooks/{webhook.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateWebhook_ReturnsOk_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a webhook first
        var webhookRequest = new Application.WebhookEndpoints.CreateWebhookEndpointRequest("https://example.com/webhook", "test-secret-at-least-16-chars", new List<string> { "proposal.created" });
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/webhooks", webhookRequest);
        var webhook = await createResponse.Content.ReadFromJsonAsync<Application.WebhookEndpoints.WebhookEndpointDto>();

        var updateRequest = new Application.WebhookEndpoints.UpdateWebhookEndpointRequest("https://example.com/webhook-updated", "updated-secret-at-least-16-chars", new List<string> { "proposal.updated" });

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{orgId}/webhooks/{webhook.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task UpdateWebhook_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, adminToken, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a webhook first
        var webhookRequest = new Application.WebhookEndpoints.CreateWebhookEndpointRequest("https://example.com/webhook", "test-secret-at-least-16-chars", new List<string> { "proposal.created" });
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/webhooks", webhookRequest);
        var webhook = await createResponse.Content.ReadFromJsonAsync<Application.WebhookEndpoints.WebhookEndpointDto>();

        // Switch to member token
        _client.AddAuthorizationHeader(memberToken);

        var updateRequest = new Application.WebhookEndpoints.UpdateWebhookEndpointRequest("https://example.com/webhook-updated", "updated-secret-at-least-16-chars", new List<string> { "proposal.updated" });

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{orgId}/webhooks/{webhook.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteWebhook_ReturnsNoContent_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a webhook first
        var webhookRequest = new Application.WebhookEndpoints.CreateWebhookEndpointRequest("https://example.com/webhook", "test-secret-at-least-16-chars", new List<string> { "proposal.created" });
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/webhooks", webhookRequest);
        var webhook = await createResponse.Content.ReadFromJsonAsync<Application.WebhookEndpoints.WebhookEndpointDto>();

        // Act
        var response = await _client.DeleteAsync($"/organizations/{orgId}/webhooks/{webhook.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteWebhook_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, adminToken, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a webhook first
        var webhookRequest = new Application.WebhookEndpoints.CreateWebhookEndpointRequest("https://example.com/webhook", "test-secret-at-least-16-chars", new List<string> { "proposal.created" });
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/webhooks", webhookRequest);
        var webhook = await createResponse.Content.ReadFromJsonAsync<Application.WebhookEndpoints.WebhookEndpointDto>();

        // Switch to member token
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.DeleteAsync($"/organizations/{orgId}/webhooks/{webhook.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetWebhooks_ReturnsOk_ForGlobalAdmin()
    {
        // Arrange
        var (orgId, _, _, _, _) = await CreateOrgWithUsersAsync();
        var (_, globalAdminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(globalAdminToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/webhooks");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    #endregion

    #region OutboundEvent Authorization Tests

    [Fact]
    public async Task GetAllOutboundEvents_ReturnsOk_ForOrgAdmin()
    {
        // Arrange
        var (orgId, _, adminToken, _, _) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/outbound-events");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAllOutboundEvents_ReturnsForbidden_ForRegularMember()
    {
        // Arrange
        var (orgId, _, _, _, memberToken) = await CreateOrgWithUsersAsync();
        _client.AddAuthorizationHeader(memberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/outbound-events");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAllOutboundEvents_ReturnsForbidden_ForNonMember()
    {
        // Arrange
        var (orgId, _, _, _, _) = await CreateOrgWithUsersAsync();
        var (_, nonMemberToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(nonMemberToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/outbound-events");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAllOutboundEvents_ReturnsOk_ForGlobalAdmin()
    {
        // Arrange
        var (orgId, _, _, _, _) = await CreateOrgWithUsersAsync();
        var (_, globalAdminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(globalAdminToken);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/outbound-events");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    #endregion
}
