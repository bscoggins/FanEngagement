using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.DevDataSeeding;
using FanEngagement.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class AdminSeedingTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public AdminSeedingTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task SeedDevData_ReturnsUnauthorized_WithoutToken()
    {
        // Act
        var response = await _client.PostAsync("/admin/seed-dev-data", null);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SeedDevData_ReturnsForbidden_ForRegularUser()
    {
        // Arrange - Create a regular user and get a token
        var (_, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(token);

        // Act
        var response = await _client.PostAsync("/admin/seed-dev-data", null);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SeedDevData_ReturnsOk_ForAdminUser_InDevelopment()
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
        var response = await _client.PostAsync("/admin/seed-dev-data", null);

        // Assert
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<DevDataSeedingResult>();
        Assert.NotNull(result);
        
        // Verify some data was created
        Assert.True(result!.OrganizationsCreated >= 0);
        Assert.True(result.UsersCreated >= 0);
        Assert.True(result.MembershipsCreated >= 0);
        Assert.True(result.ShareTypesCreated >= 0);
        Assert.True(result.ShareIssuancesCreated >= 0);
        Assert.True(result.ProposalsCreated >= 0);
    }

    [Fact]
    public async Task SeedDevData_IsIdempotent_ReturnsZeroOnSecondCall()
    {
        // Arrange - Create an admin user
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

        // Act - First call
        var response1 = await _client.PostAsync("/admin/seed-dev-data", null);
        Assert.Equal(HttpStatusCode.OK, response1.StatusCode);
        var result1 = await response1.Content.ReadFromJsonAsync<DevDataSeedingResult>();
        Assert.NotNull(result1);

        _output.WriteLine($"First call: {result1!.OrganizationsCreated} orgs, {result1.UsersCreated} users, {result1.MembershipsCreated} memberships");

        // Act - Second call
        var response2 = await _client.PostAsync("/admin/seed-dev-data", null);
        Assert.Equal(HttpStatusCode.OK, response2.StatusCode);
        var result2 = await response2.Content.ReadFromJsonAsync<DevDataSeedingResult>();
        Assert.NotNull(result2);

        _output.WriteLine($"Second call: {result2!.OrganizationsCreated} orgs, {result2.UsersCreated} users, {result2.MembershipsCreated} memberships");

        // Assert - Second call should create nothing (idempotent)
        Assert.Equal(0, result2.OrganizationsCreated);
        Assert.Equal(0, result2.UsersCreated);
        Assert.Equal(0, result2.MembershipsCreated);
        Assert.Equal(0, result2.ShareTypesCreated);
        Assert.Equal(0, result2.ShareIssuancesCreated);
        Assert.Equal(0, result2.ProposalsCreated);
        Assert.Equal(0, result2.VotesCreated);
    }

    [Fact]
    public async Task SeedDevData_CreatesExpectedEntities()
    {
        // Arrange - Create an admin user
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
        var response = await _client.PostAsync("/admin/seed-dev-data", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<DevDataSeedingResult>();
        Assert.NotNull(result);

        // Assert - Verify entities were created in database
        using var verifyScope = _factory.Services.CreateScope();
        var verifyDbContext = verifyScope.ServiceProvider.GetRequiredService<FanEngagement.Infrastructure.Persistence.FanEngagementDbContext>();

        // Check organizations
        var techOrg = await verifyDbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "Tech Innovators");
        var creativeOrg = await verifyDbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "Creative Studios");
        Assert.NotNull(techOrg);
        Assert.NotNull(creativeOrg);

        // Check users
        var alice = await verifyDbContext.Users.FirstOrDefaultAsync(u => u.Email == "alice@example.com");
        var bob = await verifyDbContext.Users.FirstOrDefaultAsync(u => u.Email == "bob@example.com");
        var charlie = await verifyDbContext.Users.FirstOrDefaultAsync(u => u.Email == "charlie@example.com");
        Assert.NotNull(alice);
        Assert.NotNull(bob);
        Assert.NotNull(charlie);

        // Check share types
        var votingShare = await verifyDbContext.ShareTypes.FirstOrDefaultAsync(st => st.Symbol == "VOTE");
        var founderShare = await verifyDbContext.ShareTypes.FirstOrDefaultAsync(st => st.Symbol == "FNDR");
        Assert.NotNull(votingShare);
        Assert.NotNull(founderShare);

        // Check proposals
        var proposals = await verifyDbContext.Proposals.ToListAsync();
        Assert.True(proposals.Count >= 2);
    }
}
