using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Users;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class AuthenticationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public AuthenticationTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task Login_ReturnsToken_WithValidCredentials()
    {
        // Arrange - Create a test user first
        var password = "TestPassword123!";
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = password
        };
        
        var createResponse = await _client.PostAsJsonAsync("/users", createRequest);
        var createdUser = await createResponse.Content.ReadFromJsonAsync<UserDto>();

        var loginRequest = new LoginRequest
        {
            Email = createRequest.Email,
            Password = password
        };

        // Act
        var response = await _client.PostAsJsonAsync("/auth/login", loginRequest);

        // Assert
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var loginResponse = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(loginResponse);
        Assert.NotEmpty(loginResponse!.Token);
        Assert.Equal(createdUser!.Id, loginResponse.UserId);
        Assert.Equal(createdUser.Email, loginResponse.Email);
        Assert.Equal(createdUser.DisplayName, loginResponse.DisplayName);
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WithInvalidPassword()
    {
        // Arrange - Create a test user first
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = "TestPassword123!"
        };
        
        await _client.PostAsJsonAsync("/users", createRequest);

        var loginRequest = new LoginRequest
        {
            Email = createRequest.Email,
            Password = "WrongPassword123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WithNonExistentUser()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "nonexistent@example.com",
            Password = "SomePassword123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_ReturnsUnauthorized_WithoutToken()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/users/{userId}");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_ReturnsOk_WithValidToken()
    {
        // Arrange - Create a user and get a token
        var (user, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        _client.AddAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync($"/users/{user.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var retrievedUser = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(retrievedUser);
        Assert.Equal(user.Id, retrievedUser!.Id);
    }

    [Fact]
    public async Task GetAllUsers_ReturnsUnauthorized_WithoutToken()
    {
        // Act
        var response = await _client.GetAsync("/users");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetAllUsers_ReturnsOk_WithValidToken()
    {
        // Arrange - Create a user and get a token
        var (_, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        _client.AddAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/users");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var users = await response.Content.ReadFromJsonAsync<List<UserDto>>();
        Assert.NotNull(users);
    }

    [Fact]
    public async Task Login_ReturnsRoleInResponse_ForRegularUser()
    {
        // Arrange - Create a test user first
        var password = "TestPassword123!";
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = password
        };
        
        await _client.PostAsJsonAsync("/users", createRequest);

        var loginRequest = new LoginRequest
        {
            Email = createRequest.Email,
            Password = password
        };

        // Act
        var response = await _client.PostAsJsonAsync("/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var loginResponse = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(loginResponse);
        Assert.Equal("User", loginResponse!.Role);
    }
}
