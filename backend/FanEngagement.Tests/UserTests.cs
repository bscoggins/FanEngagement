using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Users;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class UserTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public UserTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
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
            DisplayName = "Test User"
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
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User"
        };
        var createResponse = await _client.PostAsJsonAsync("/users", createRequest);
        var createdUser = await createResponse.Content.ReadFromJsonAsync<UserDto>();

        // Act
        var response = await _client.GetAsync($"/users/{createdUser!.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(user);
        Assert.Equal(createdUser.Id, user!.Id);
        Assert.Equal(createdUser.Email, user.Email);
    }

    [Fact]
    public async Task GetUserById_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange
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
            DisplayName = "Test User 1"
        };
        var request2 = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User 2"
        };
        await _client.PostAsJsonAsync("/users", request1);
        await _client.PostAsJsonAsync("/users", request2);

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
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User"
        };
        var createResponse = await _client.PostAsJsonAsync("/users", createRequest);
        var createdUser = await createResponse.Content.ReadFromJsonAsync<UserDto>();

        var updateRequest = new UpdateUserRequest
        {
            Email = $"updated-{Guid.NewGuid()}@example.com",
            DisplayName = "Updated User"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{createdUser!.Id}", updateRequest);

        // Assert
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updatedUser = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(updatedUser);
        Assert.Equal(createdUser.Id, updatedUser!.Id);
        Assert.Equal(updateRequest.Email, updatedUser.Email);
        Assert.Equal(updateRequest.DisplayName, updatedUser.DisplayName);
    }

    [Fact]
    public async Task UpdateUser_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange
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
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User"
        };
        var createResponse = await _client.PostAsJsonAsync("/users", createRequest);
        var createdUser = await createResponse.Content.ReadFromJsonAsync<UserDto>();

        // Act
        var deleteResponse = await _client.DeleteAsync($"/users/{createdUser!.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Verify user is deleted
        var getResponse = await _client.GetAsync($"/users/{createdUser.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteUser_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.DeleteAsync($"/users/{nonExistentId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
