using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class OrganizationCreationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public OrganizationCreationTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateOrganization_AsGlobalAdmin_CreatesOrgAndOrgAdminMembership()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test Organization for onboarding"
        };

        // Act
        var createResponse = await _client.PostAsJsonAsync("/organizations", request);

        // Assert - Organization created successfully
        if (createResponse.StatusCode != HttpStatusCode.Created)
        {
            var body = await createResponse.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {createResponse.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var organization = await createResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);
        Assert.NotEqual(Guid.Empty, organization!.Id);
        Assert.Equal(request.Name, organization.Name);
        Assert.Equal(request.Description, organization.Description);

        // Assert - Creator is automatically added as OrgAdmin
        var membershipResponse = await _client.GetAsync($"/organizations/{organization.Id}/memberships");
        Assert.Equal(HttpStatusCode.OK, membershipResponse.StatusCode);
        
        var memberships = await membershipResponse.Content.ReadFromJsonAsync<List<MembershipDto>>();
        Assert.NotNull(memberships);
        Assert.Single(memberships!);
        
        var creatorMembership = memberships[0];
        Assert.Equal(organization.Id, creatorMembership.OrganizationId);
        Assert.Equal(adminUserId, creatorMembership.UserId);
        Assert.Equal(OrganizationRole.OrgAdmin, creatorMembership.Role);
    }

    [Fact]
    public async Task CreateOrganization_AsNonAdmin_ReturnsForbidden()
    {
        // Arrange - Create a regular user (not admin)
        var userResponse = await _client.PostAsJsonAsync("/users", new CreateUserRequest
        {
            Email = $"regular-{Guid.NewGuid()}@example.com",
            DisplayName = "Regular User",
            Password = "TestPassword123!"
        });
        var user = await userResponse.Content.ReadFromJsonAsync<User>();
        Assert.NotNull(user);

        // Login as regular user
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", new
        {
            email = user!.Email,
            password = "TestPassword123!"
        });
        var loginData = await loginResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var userToken = loginData.GetProperty("token").GetString();
        Assert.NotNull(userToken);
        _client.AddAuthorizationHeader(userToken!);

        var request = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test Organization"
        };

        // Act
        var createResponse = await _client.PostAsJsonAsync("/organizations", request);

        // Assert - Request is forbidden (403) for non-admin users
        if (createResponse.StatusCode != HttpStatusCode.Forbidden)
        {
            var body = await createResponse.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {createResponse.StatusCode}, Body: {body}");
        }
        
        Assert.Equal(HttpStatusCode.Forbidden, createResponse.StatusCode);
    }

    [Fact]
    public async Task CreateOrganization_WithoutAuthentication_ReturnsUnauthorized()
    {
        // Arrange - No authentication token
        var request = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test Organization"
        };

        // Act
        var createResponse = await _client.PostAsJsonAsync("/organizations", request);

        // Assert - Request is unauthorized (401)
        Assert.Equal(HttpStatusCode.Unauthorized, createResponse.StatusCode);
    }

    [Fact]
    public async Task CreateOrganization_WithEmptyName_ReturnsBadRequest()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = "", // Invalid: empty name
            Description = "Test Organization"
        };

        // Act
        var createResponse = await _client.PostAsJsonAsync("/organizations", request);

        // Assert - Validation error
        Assert.Equal(HttpStatusCode.BadRequest, createResponse.StatusCode);
    }

    [Fact]
    public async Task CreateOrganization_WithTooLongName_ReturnsBadRequest()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = new string('a', 201), // Invalid: exceeds 200 characters
            Description = "Test Organization"
        };

        // Act
        var createResponse = await _client.PostAsJsonAsync("/organizations", request);

        // Assert - Validation error
        Assert.Equal(HttpStatusCode.BadRequest, createResponse.StatusCode);
    }

    [Fact]
    public async Task CreateOrganization_MultipleOrgsWithSameAdmin_CreatesMultipleMemberships()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act - Create two organizations
        var org1Response = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = $"Test Org 1 {Guid.NewGuid()}",
            Description = "First Organization"
        });
        var org1 = await org1Response.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org1);

        var org2Response = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = $"Test Org 2 {Guid.NewGuid()}",
            Description = "Second Organization"
        });
        var org2 = await org2Response.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org2);

        // Assert - Admin is OrgAdmin of both organizations
        var memberships1Response = await _client.GetAsync($"/organizations/{org1!.Id}/memberships");
        var memberships1 = await memberships1Response.Content.ReadFromJsonAsync<List<MembershipDto>>();
        Assert.NotNull(memberships1);
        Assert.Single(memberships1!);
        Assert.Equal(adminUserId, memberships1[0].UserId);
        Assert.Equal(OrganizationRole.OrgAdmin, memberships1[0].Role);

        var memberships2Response = await _client.GetAsync($"/organizations/{org2!.Id}/memberships");
        var memberships2 = await memberships2Response.Content.ReadFromJsonAsync<List<MembershipDto>>();
        Assert.NotNull(memberships2);
        Assert.Single(memberships2!);
        Assert.Equal(adminUserId, memberships2[0].UserId);
        Assert.Equal(OrganizationRole.OrgAdmin, memberships2[0].Role);
    }
}
