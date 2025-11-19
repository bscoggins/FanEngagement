using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class AdminAuthorizationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public AdminAuthorizationTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task Login_IncludesAdminRoleInToken_ForAdminUser()
    {
        // Arrange - Create an admin user directly in the database
        using var scope = _factory.Services.CreateScope();
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

        var loginRequest = new LoginRequest
        {
            Email = adminEmail,
            Password = adminPassword
        };

        // Act
        var response = await _client.PostAsJsonAsync("/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var loginResponse = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(loginResponse);
        Assert.Equal("Admin", loginResponse!.Role);
        
        // Verify the JWT token contains the role claim
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(loginResponse.Token);
        var roleClaim = token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role);
        Assert.NotNull(roleClaim);
        Assert.Equal("Admin", roleClaim!.Value);
    }

    [Fact]
    public async Task RegularUser_HasUserRole_InToken()
    {
        // Arrange - Create a regular user
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
        
        // Verify the JWT token contains the User role claim
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(loginResponse!.Token);
        var roleClaim = token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role);
        Assert.NotNull(roleClaim);
        Assert.Equal("User", roleClaim!.Value);
    }

    [Fact]
    public async Task AdminEndpoint_ReturnsOk_ForAdminUser()
    {
        // Arrange - Create an admin user directly in the database
        using var scope = _factory.Services.CreateScope();
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

        var loginRequest = new LoginRequest
        {
            Email = adminEmail,
            Password = adminPassword
        };

        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        
        _client.AddAuthorizationHeader(loginResult!.Token);

        // Act
        var response = await _client.GetAsync("/users/admin/stats");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("totalUsers", content);
        Assert.Contains("This endpoint is only accessible to administrators", content);
    }

    [Fact]
    public async Task AdminEndpoint_ReturnsForbidden_ForRegularUser()
    {
        // Arrange - Create a regular user and get a token
        var (_, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        
        _client.AddAuthorizationHeader(token);

        // Act
        var response = await _client.GetAsync("/users/admin/stats");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoint_ReturnsUnauthorized_WithoutToken()
    {
        // Act
        var response = await _client.GetAsync("/users/admin/stats");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
