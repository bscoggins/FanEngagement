using System.Net.Http.Json;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Users;

namespace FanEngagement.Tests;

public static class TestAuthenticationHelper
{
    public static async Task<(UserDto User, string Token)> CreateAuthenticatedUserAsync(HttpClient client)
    {
        // Create a user
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = "TestPassword123!"
        };

        var createResponse = await client.PostAsJsonAsync("/users", createRequest);
        if (!createResponse.IsSuccessStatusCode)
        {
            var errorBody = await createResponse.Content.ReadAsStringAsync();
            throw new Exception($"Failed to create user: {createResponse.StatusCode} - {errorBody}");
        }

        var user = await createResponse.Content.ReadFromJsonAsync<UserDto>();
        if (user == null)
        {
            throw new Exception("User was not returned from create endpoint");
        }

        // Log in to get a token
        var loginRequest = new LoginRequest
        {
            Email = createRequest.Email,
            Password = createRequest.Password
        };

        var loginResponse = await client.PostAsJsonAsync("/auth/login", loginRequest);
        if (!loginResponse.IsSuccessStatusCode)
        {
            var errorBody = await loginResponse.Content.ReadAsStringAsync();
            throw new Exception($"Failed to login: {loginResponse.StatusCode} - {errorBody}");
        }

        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        if (loginResult == null)
        {
            throw new Exception("Login response was null");
        }

        return (user, loginResult.Token);
    }

    public static void AddAuthorizationHeader(this HttpClient client, string token)
    {
        // Remove any existing Authorization header to avoid cross-test contamination
        client.DefaultRequestHeaders.Remove("Authorization");
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }
}
