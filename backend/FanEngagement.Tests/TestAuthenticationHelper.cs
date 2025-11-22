using System.Net.Http.Json;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;

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

    public static async Task<(Guid UserId, string Token)> CreateAuthenticatedAdminAsync(TestWebApplicationFactory factory)
    {
        // Create admin user directly in the database
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagement.Infrastructure.Persistence.FanEngagementDbContext>();
        var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();

        var adminEmail = $"admin-{Guid.NewGuid()}@example.com";
        var adminPassword = "AdminPass123!";
        var adminUser = new FanEngagement.Domain.Entities.User
        {
            Id = Guid.NewGuid(),
            Email = adminEmail,
            DisplayName = "Admin User",
            PasswordHash = authService.HashPassword(adminPassword),
            Role = UserRole.Admin,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Users.Add(adminUser);
        await dbContext.SaveChangesAsync();

        var client = factory.CreateClient();
        var loginRequest = new LoginRequest
        {
            Email = adminEmail,
            Password = adminPassword
        };

        var loginResponse = await client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();

        return (adminUser.Id, loginResult!.Token);
    }

    public static void AddAuthorizationHeader(this HttpClient client, string token)
    {
        // Remove any existing Authorization header to avoid cross-test contamination
        client.DefaultRequestHeaders.Remove("Authorization");
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }
}
