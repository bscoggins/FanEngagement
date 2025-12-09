using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Users;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class PasswordChangeTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public PasswordChangeTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task ChangeMyPassword_Success_WithValidCurrentPassword()
    {
        // Arrange - create a user and get their token
        var (user, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(token);

        var request = new ChangePasswordRequest
        {
            CurrentPassword = "TestPassword123!",
            NewPassword = "NewTestPassword456!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users/me/password", request);

        // Assert
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.NotNull(result);
        Assert.Equal("Password changed successfully", result!["message"]);

        // Verify: can login with new password
        var loginRequest = new FanEngagement.Application.Authentication.LoginRequest
        {
            Email = user.Email,
            Password = "NewTestPassword456!"
        };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        // Verify: cannot login with old password
        var oldLoginRequest = new FanEngagement.Application.Authentication.LoginRequest
        {
            Email = user.Email,
            Password = "TestPassword123!"
        };
        var oldLoginResponse = await _client.PostAsJsonAsync("/auth/login", oldLoginRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, oldLoginResponse.StatusCode);
    }

    [Fact]
    public async Task ChangeMyPassword_Fails_WithIncorrectCurrentPassword()
    {
        // Arrange
        var (_, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(token);

        var request = new ChangePasswordRequest
        {
            CurrentPassword = "WrongPassword123!",
            NewPassword = "NewTestPassword456!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users/me/password", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Current password is incorrect", body);
    }

    [Fact]
    public async Task ChangeMyPassword_RequiresAuthentication()
    {
        // Arrange - no authentication token
        var request = new ChangePasswordRequest
        {
            CurrentPassword = "TestPassword123!",
            NewPassword = "NewTestPassword456!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users/me/password", request);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ChangeMyPassword_Fails_WithShortPassword()
    {
        // Arrange
        var (_, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(token);

        var request = new ChangePasswordRequest
        {
            CurrentPassword = "TestPassword123!",
            NewPassword = "short" // Too short
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users/me/password", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SetUserPassword_Success_AsAdmin()
    {
        // Arrange - create a regular user
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);

        // Get admin token
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new SetPasswordRequest
        {
            NewPassword = "AdminSetPassword789!"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{user.Id}/password", request);

        // Assert
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.NotNull(result);
        Assert.Equal("Password set successfully", result!["message"]);

        // Verify: user can login with new password
        var loginRequest = new FanEngagement.Application.Authentication.LoginRequest
        {
            Email = user.Email,
            Password = "AdminSetPassword789!"
        };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        // Verify: cannot login with old password
        var oldLoginRequest = new FanEngagement.Application.Authentication.LoginRequest
        {
            Email = user.Email,
            Password = "TestPassword123!"
        };
        var oldLoginResponse = await _client.PostAsJsonAsync("/auth/login", oldLoginRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, oldLoginResponse.StatusCode);
    }

    [Fact]
    public async Task SetUserPassword_Fails_ForNonExistentUser()
    {
        // Arrange - admin token
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var nonExistentId = Guid.NewGuid();
        var request = new SetPasswordRequest
        {
            NewPassword = "AdminSetPassword789!"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{nonExistentId}/password", request);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task SetUserPassword_RequiresAdminRole()
    {
        // Arrange - create two regular users
        var (_, token1) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (user2, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);

        // Try to set another user's password as a regular user
        _client.AddAuthorizationHeader(token1);

        var request = new SetPasswordRequest
        {
            NewPassword = "NewPassword789!"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{user2.Id}/password", request);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SetUserPassword_RequiresAuthentication()
    {
        // Arrange - no authentication token
        var userId = Guid.NewGuid();
        var request = new SetPasswordRequest
        {
            NewPassword = "NewPassword789!"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{userId}/password", request);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SetUserPassword_Fails_WithShortPassword()
    {
        // Arrange - create a user and get admin token
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new SetPasswordRequest
        {
            NewPassword = "short" // Too short
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{user.Id}/password", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AdminSetPassword_DoesNotRequireCurrentPassword()
    {
        // Arrange - create a user with known password
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);

        // Get admin token
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new SetPasswordRequest
        {
            NewPassword = "AdminResetPassword123!"
        };

        // Act - admin sets password without knowing current password
        var response = await _client.PutAsJsonAsync($"/users/{user.Id}/password", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify: user can login with new password
        var loginRequest = new FanEngagement.Application.Authentication.LoginRequest
        {
            Email = user.Email,
            Password = "AdminResetPassword123!"
        };
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }
}
