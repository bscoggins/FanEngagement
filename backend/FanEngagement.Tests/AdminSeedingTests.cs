using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.DevDataSeeding;
using FanEngagement.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class AdminSeedingTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
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

    public Task InitializeAsync() => Task.CompletedTask;

    public async Task DisposeAsync()
    {
        // Clean up seeded test data after each test to ensure test isolation
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagement.Infrastructure.Persistence.FanEngagementDbContext>();
        
        // Delete organizations (cascades to memberships, shareTypes, shareIssuances, shareBalances, proposals, proposalOptions, votes, webhookEndpoints, outboundEvents)
        var orgs = await dbContext.Organizations
            .Where(o => o.Name == "Tech Innovators" || o.Name == "Green Energy United" || o.Name == "City FC Supporters Trust" || o.Name == "Performance Test Org")
            .ToListAsync();
        dbContext.Organizations.RemoveRange(orgs);
        
        // Delete users (new expanded user list)
        var seededEmails = new[]
        {
            "root_admin@platform.local",
            "platform_admin@fanengagement.dev",
            "alice@example.com",
            "bob@abefroman.net",
            "carlos@demo.co",
            "dana@sample.io",
            "erika@cityfc.support",
            "frank@cityfc.support"
        };
        var users = await dbContext.Users
            .Where(u => seededEmails.Contains(u.Email))
            .ToListAsync();
        dbContext.Users.RemoveRange(users);
        
        await dbContext.SaveChangesAsync();
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

        // Check organizations (3 organizations)
        var techOrg = await verifyDbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "Tech Innovators");
        var greenOrg = await verifyDbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "Green Energy United");
        var cityFcOrg = await verifyDbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "City FC Supporters Trust");
        Assert.NotNull(techOrg);
        Assert.NotNull(greenOrg);
        Assert.NotNull(cityFcOrg);

        // Check platform admin users
        var rootAdmin = await verifyDbContext.Users.FirstOrDefaultAsync(u => u.Email == "root_admin@platform.local");
        var platformAdmin = await verifyDbContext.Users.FirstOrDefaultAsync(u => u.Email == "platform_admin@fanengagement.dev");
        Assert.NotNull(rootAdmin);
        Assert.NotNull(platformAdmin);
        Assert.Equal(UserRole.Admin, rootAdmin!.Role);
        Assert.Equal(UserRole.Admin, platformAdmin!.Role);

        // Check regular users
        var alice = await verifyDbContext.Users.FirstOrDefaultAsync(u => u.Email == "alice@example.com");
        var bob = await verifyDbContext.Users.FirstOrDefaultAsync(u => u.Email == "bob@abefroman.net");
        var carlos = await verifyDbContext.Users.FirstOrDefaultAsync(u => u.Email == "carlos@demo.co");
        Assert.NotNull(alice);
        Assert.NotNull(bob);
        Assert.NotNull(carlos);

        // Check share types (Standard and Premium for each org)
        var techStdShare = await verifyDbContext.ShareTypes.FirstOrDefaultAsync(st => st.OrganizationId == techOrg!.Id && st.Symbol == "STDV");
        var techPrmShare = await verifyDbContext.ShareTypes.FirstOrDefaultAsync(st => st.OrganizationId == techOrg!.Id && st.Symbol == "PRMV");
        Assert.NotNull(techStdShare);
        Assert.NotNull(techPrmShare);
        Assert.Equal(1.0m, techStdShare!.VotingWeight);
        Assert.Equal(5.0m, techPrmShare!.VotingWeight);

        // Check proposals (should have at least 9 - 3 per org)
        var proposals = await verifyDbContext.Proposals.ToListAsync();
        Assert.True(proposals.Count >= 9, $"Expected at least 9 proposals, got {proposals.Count}");

        // Check that proposals have different statuses
        var openProposals = proposals.Where(p => p.Status == ProposalStatus.Open).ToList();
        var closedProposals = proposals.Where(p => p.Status == ProposalStatus.Closed).ToList();
        var draftProposals = proposals.Where(p => p.Status == ProposalStatus.Draft).ToList();
        Assert.True(openProposals.Count >= 3, $"Expected at least 3 open proposals, got {openProposals.Count}");
        Assert.True(closedProposals.Count >= 3, $"Expected at least 3 closed proposals, got {closedProposals.Count}");
        Assert.True(draftProposals.Count >= 3, $"Expected at least 3 draft/scheduled proposals, got {draftProposals.Count}");
    }

    [Fact]
    public async Task GetSeedScenarios_ReturnsAvailableScenarios()
    {
        // Arrange - Create an admin user and get token
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
        var response = await _client.GetAsync("/admin/seed-scenarios");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var scenarios = await response.Content.ReadFromJsonAsync<List<SeedScenarioInfo>>();
        Assert.NotNull(scenarios);
        Assert.True(scenarios!.Count >= 3);
        Assert.Contains(scenarios, s => s.Name == "Basic Demo");
        Assert.Contains(scenarios, s => s.Name == "Heavy Proposals");
        Assert.Contains(scenarios, s => s.Name == "Webhook Failures");
    }

    [Fact]
    public async Task SeedDevData_WithHeavyProposalsScenario_CreatesAdditionalProposals()
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
        var response = await _client.PostAsync("/admin/seed-dev-data?scenario=HeavyProposals", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<DevDataSeedingResult>();
        Assert.NotNull(result);
        Assert.Equal("HeavyProposals", result!.Scenario);
        
        // HeavyProposals should create more proposals than BasicDemo
        Assert.True(result.ProposalsCreated >= 50, $"Expected at least 50 proposals, got {result.ProposalsCreated}");
        
        _output.WriteLine($"HeavyProposals scenario created: {result.ProposalsCreated} proposals");
    }

    [Fact]
    public async Task SeedDevData_WithWebhookFailuresScenario_CreatesWebhooksAndEvents()
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
        var response = await _client.PostAsync("/admin/seed-dev-data?scenario=WebhookFailures", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<DevDataSeedingResult>();
        Assert.NotNull(result);
        Assert.Equal("WebhookFailures", result!.Scenario);
        
        // WebhookFailures should create webhook endpoints and outbound events
        Assert.True(result.WebhookEndpointsCreated >= 3, $"Expected at least 3 webhook endpoints, got {result.WebhookEndpointsCreated}");
        Assert.True(result.OutboundEventsCreated >= 1, $"Expected at least 1 outbound event, got {result.OutboundEventsCreated}");
        
        _output.WriteLine($"WebhookFailures scenario created: {result.WebhookEndpointsCreated} webhooks, {result.OutboundEventsCreated} events");
    }

    [Fact]
    public async Task SeedDevData_ScenariosAreIdempotent()
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
        var response1 = await _client.PostAsync("/admin/seed-dev-data?scenario=HeavyProposals", null);
        Assert.Equal(HttpStatusCode.OK, response1.StatusCode);
        var result1 = await response1.Content.ReadFromJsonAsync<DevDataSeedingResult>();
        Assert.NotNull(result1);

        _output.WriteLine($"First HeavyProposals call: {result1!.ProposalsCreated} proposals");

        // Act - Second call (should be idempotent)
        var response2 = await _client.PostAsync("/admin/seed-dev-data?scenario=HeavyProposals", null);
        Assert.Equal(HttpStatusCode.OK, response2.StatusCode);
        var result2 = await response2.Content.ReadFromJsonAsync<DevDataSeedingResult>();
        Assert.NotNull(result2);

        _output.WriteLine($"Second HeavyProposals call: {result2!.ProposalsCreated} proposals");

        // Assert - Second call should create nothing (idempotent)
        Assert.Equal(0, result2.OrganizationsCreated);
        Assert.Equal(0, result2.UsersCreated);
        Assert.Equal(0, result2.ProposalsCreated);
    }
}
