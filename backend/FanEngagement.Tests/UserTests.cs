using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class UserTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public UserTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateUser_ReturnsCreated_WithValidRequest()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = "TestPassword123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users", request);

        // Assert
        if (response.StatusCode != HttpStatusCode.Created)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(user);
        Assert.NotEqual(Guid.Empty, user!.Id);
        Assert.Equal(request.Email, user.Email);
        Assert.Equal(request.DisplayName, user.DisplayName);
        Assert.True(user.CreatedAt <= DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task GetUserById_ReturnsUser_WhenExists()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        // Use admin token for GetById operation
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.GetAsync($"/users/{user.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var retrievedUser = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(retrievedUser);
        Assert.Equal(user.Id, retrievedUser!.Id);
        Assert.Equal(user.Email, retrievedUser.Email);
    }

    [Fact]
    public async Task GetUserById_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange - use admin token for GetById operation
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);
        
        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/users/{nonExistentId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetAllUsers_ReturnsListOfUsers()
    {
        // Arrange
        var request1 = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User 1",
            Password = "TestPassword123!"
        };
        var request2 = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User 2",
            Password = "TestPassword123!"
        };
        await _client.PostAsJsonAsync("/users", request1);
        await _client.PostAsJsonAsync("/users", request2);

        // Get admin authentication token for GetAll operation
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.GetAsync("/users");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var users = await response.Content.ReadFromJsonAsync<List<UserDto>>();
        Assert.NotNull(users);
        Assert.True(users!.Count >= 2);
    }

    [Fact]
    public async Task UpdateUser_ReturnsUpdatedUser_WhenExists()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        // Use admin token for update operation
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var updateRequest = new UpdateUserRequest
        {
            Email = $"updated-{Guid.NewGuid()}@example.com",
            DisplayName = "Updated User"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{user.Id}", updateRequest);

        // Assert
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updatedUser = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(updatedUser);
        Assert.Equal(user.Id, updatedUser!.Id);
        Assert.Equal(updateRequest.Email, updatedUser.Email);
        Assert.Equal(updateRequest.DisplayName, updatedUser.DisplayName);
    }

    [Fact]
    public async Task UpdateUser_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange - use admin token for update operation
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var nonExistentId = Guid.NewGuid();
        var updateRequest = new UpdateUserRequest
        {
            Email = "test@example.com",
            DisplayName = "Test User"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{nonExistentId}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_ReturnsNoContent_WhenExists()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        // Use admin token for delete operation
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var deleteResponse = await _client.DeleteAsync($"/users/{user.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Verify user is deleted
        var getResponse = await _client.GetAsync($"/users/{user.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange - use admin token for delete operation
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.DeleteAsync($"/users/{nonExistentId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateUser_ReturnsBadRequest_WhenEmailAlreadyExists()
    {
        // Arrange
        var email = $"duplicate-{Guid.NewGuid()}@example.com";
        var request1 = new CreateUserRequest
        {
            Email = email,
            DisplayName = "Test User 1",
            Password = "TestPassword123!"
        };
        var request2 = new CreateUserRequest
        {
            Email = email,
            DisplayName = "Test User 2",
            Password = "TestPassword123!"
        };

        // Act
        var response1 = await _client.PostAsJsonAsync("/users", request1);
        var response2 = await _client.PostAsJsonAsync("/users", request2);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response1.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, response2.StatusCode);
    }

    [Fact]
    public async Task UpdateUser_ReturnsBadRequest_WhenEmailAlreadyExists()
    {
        // Arrange
        var user1Request = new CreateUserRequest
        {
            Email = $"user1-{Guid.NewGuid()}@example.com",
            DisplayName = "User 1",
            Password = "TestPassword123!"
        };
        var user2Request = new CreateUserRequest
        {
            Email = $"user2-{Guid.NewGuid()}@example.com",
            DisplayName = "User 2",
            Password = "TestPassword123!"
        };

        var user1Response = await _client.PostAsJsonAsync("/users", user1Request);
        var user1 = await user1Response.Content.ReadFromJsonAsync<UserDto>();

        var user2Response = await _client.PostAsJsonAsync("/users", user2Request);
        var user2 = await user2Response.Content.ReadFromJsonAsync<UserDto>();

        // Get admin authentication token for update operation
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var updateRequest = new UpdateUserRequest
        {
            Email = user2!.Email, // Try to use user2's email
            DisplayName = "Updated User 1"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{user1!.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetMyOrganizations_ReturnsCurrentUsersMemberships()
    {
        // Arrange
        var (user, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(token);

        // Create an organization and add the user as a member (requires admin)
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);
        
        var orgRequest = new FanEngagement.Application.Organizations.CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}"
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();

        var membershipRequest = new FanEngagement.Application.Memberships.CreateMembershipRequest
        {
            UserId = user.Id,
            Role = FanEngagement.Domain.Enums.OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{org!.Id}/memberships", membershipRequest);

        // Switch back to the user's token
        _client.AddAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/users/me/organizations");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var memberships = await response.Content.ReadFromJsonAsync<List<FanEngagement.Application.Memberships.MembershipWithOrganizationDto>>();
        Assert.NotNull(memberships);
        Assert.Contains(memberships!, m => m.OrganizationId == org.Id);
    }

    [Fact]
    public async Task GetMyOrganizations_RequiresAuthentication()
    {
        // Arrange - no authentication token

        // Act
        var response = await _client.GetAsync("/users/me/organizations");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
