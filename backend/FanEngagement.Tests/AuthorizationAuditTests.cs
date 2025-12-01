using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Integration tests for authorization failure audit events.
/// Verifies that 403 Forbidden responses and policy authorization failures are properly audited.
/// </summary>
public class AuthorizationAuditTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public AuthorizationAuditTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    /// <summary>
    /// Helper method to wait for an authorization audit event to be processed asynchronously.
    /// </summary>
    private static async Task<AuditEventDto?> WaitForAuthorizationDeniedAuditEventAsync(
        IAuditService auditService,
        Guid? actorUserId = null,
        string? resourceName = null,
        int maxWaitSeconds = 5)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var maxWait = TimeSpan.FromSeconds(maxWaitSeconds);
        var pollInterval = TimeSpan.FromMilliseconds(100);

        while (stopwatch.Elapsed < maxWait)
        {
            var query = new AuditQuery
            {
                ActionType = AuditActionType.AuthorizationDenied,
                ActorUserId = actorUserId,
                Outcome = AuditOutcome.Denied,
                Page = 1,
                PageSize = 100
            };

            var result = await auditService.QueryAsync(query);

            // Filter by resource name (request path) if provided
            var auditEvent = resourceName != null
                ? result.Items.FirstOrDefault(e => e.ResourceName == resourceName)
                : result.Items.FirstOrDefault();

            if (auditEvent != null)
                return auditEvent;

            await Task.Delay(pollInterval);
        }

        return null;
    }

    /// <summary>
    /// Helper to create a test user and get their JWT token.
    /// </summary>
    private async Task<(UserDto user, string token)> CreateUserAndLoginAsync(string role = "Member")
    {
        var password = "TestPassword123!";
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = password
        };

        var createResponse = await _client.PostAsJsonAsync("/users", createRequest);
        var user = await createResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(user);

        var loginRequest = new LoginRequest
        {
            Email = createRequest.Email,
            Password = password
        };

        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(loginResult);

        return (user, loginResult.Token);
    }

    [Fact]
    public async Task Access_GlobalAdminEndpoint_AsRegularUser_CreatesAuthorizationDeniedAuditEvent()
    {
        // Arrange - Create a regular user
        var (user, token) = await CreateUserAndLoginAsync();

        // Act - Attempt to access a GlobalAdmin-only endpoint (GET /users requires GlobalAdmin)
        var request = new HttpRequestMessage(HttpMethod.Get, "/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        // Assert - Should return 403 Forbidden
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Verify audit event was created
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuthorizationDeniedAuditEventAsync(
            auditService,
            actorUserId: user.Id,
            resourceName: "/users");

        _output.WriteLine($"Found audit event: {auditEvent != null}");

        Assert.NotNull(auditEvent);
        Assert.Equal(user.Id, auditEvent.ActorUserId);
        // ActorDisplayName might be the display name or email depending on JWT claims
        Assert.True(
            auditEvent.ActorDisplayName == user.DisplayName || auditEvent.ActorDisplayName == user.Email,
            $"Expected ActorDisplayName to be either '{user.DisplayName}' or '{user.Email}', but got '{auditEvent.ActorDisplayName}'");
        Assert.Equal(AuditActionType.AuthorizationDenied, auditEvent.ActionType);
        Assert.Equal(AuditOutcome.Denied, auditEvent.Outcome);
        Assert.Equal(AuditResourceType.SystemConfiguration, auditEvent.ResourceType);
        Assert.Equal("/users", auditEvent.ResourceName);
        Assert.Contains("Access denied to GET /users", auditEvent.FailureReason);

        _output.WriteLine($"Authorization denied audit event: ID={auditEvent.Id}, User={auditEvent.ActorDisplayName}, Path={auditEvent.ResourceName}");
    }

    [Fact]
    public async Task Access_OrgAdminEndpoint_AsNonOrgAdmin_CreatesAuthorizationDeniedAuditEvent()
    {
        // Arrange - Create an admin and an organization
        var adminPassword = "Admin123!";
        var adminLogin = new LoginRequest { Email = "admin@example.com", Password = adminPassword };
        var adminLoginResponse = await _client.PostAsJsonAsync("/auth/login", adminLogin);
        var adminLoginResult = await adminLoginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(adminLoginResult);

        // Create an organization as admin
        var createOrgRequest = new HttpRequestMessage(HttpMethod.Post, "/organizations");
        createOrgRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminLoginResult.Token);
        createOrgRequest.Content = JsonContent.Create(new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}"
        });
        var createOrgResponse = await _client.SendAsync(createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create a regular user (not an org member)
        var (user, token) = await CreateUserAndLoginAsync();

        // Act - Attempt to access an OrgMember-only endpoint (GetById requires OrgMember)
        var request = new HttpRequestMessage(HttpMethod.Get, $"/organizations/{org.Id}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        // Assert - Should return 403 Forbidden (user is authenticated but not a member)
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Verify audit event was created
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuthorizationDeniedAuditEventAsync(
            auditService,
            actorUserId: user.Id,
            resourceName: $"/organizations/{org.Id}");

        _output.WriteLine($"Found audit event for OrgMember policy failure: {auditEvent != null}");

        Assert.NotNull(auditEvent);
        Assert.Equal(user.Id, auditEvent.ActorUserId);
        Assert.Equal(AuditActionType.AuthorizationDenied, auditEvent.ActionType);
        Assert.Equal(AuditOutcome.Denied, auditEvent.Outcome);
        Assert.Contains($"/organizations/{org.Id}", auditEvent.ResourceName);

        _output.WriteLine($"OrgMember policy denial audit event: ID={auditEvent.Id}, User={auditEvent.ActorDisplayName}");
    }

    [Fact]
    public async Task Access_Unauthenticated_Returns401_NoAuditEvent()
    {
        // Arrange - No authentication token

        // Act - Attempt to access a protected endpoint without authentication
        var response = await _client.GetAsync("/users");

        // Assert - Should return 401 Unauthorized (not 403 Forbidden)
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        // Verify NO authorization denied audit event was created
        // (Unauthenticated requests return 401, not 403, so they shouldn't be audited by this middleware)
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuthorizationDeniedAuditEventAsync(
            auditService,
            resourceName: "/users");

        // Should NOT find an authorization denied audit event for 401 responses
        Assert.Null(auditEvent);

        _output.WriteLine("Correctly did not audit 401 Unauthorized response");
    }

    [Fact]
    public async Task Access_AuthorizedEndpoint_DoesNotCreateAuditEvent()
    {
        // Arrange - Create a user
        var (user, token) = await CreateUserAndLoginAsync();

        // Act - Access an endpoint the user is authorized for (e.g., GET /users/me/organizations)
        var request = new HttpRequestMessage(HttpMethod.Get, "/users/me/organizations");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        // Assert - Should return 200 OK
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Small delay to ensure any potential audit events would be processed
        await Task.Delay(500);

        // Verify NO authorization denied audit event was created
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var query = new AuditQuery
        {
            ActionType = AuditActionType.AuthorizationDenied,
            ActorUserId = user.Id,
            Page = 1,
            PageSize = 100
        };

        var result = await auditService.QueryAsync(query);

        // Should NOT find any authorization denied events for this successful request
        Assert.DoesNotContain(result.Items, e => e.ResourceName == "/users/me/organizations");

        _output.WriteLine("Correctly did not audit successful authorized request");
    }

    [Fact]
    public async Task AuthorizationDenied_IncludesRequestContext()
    {
        // Arrange - Create a regular user
        var (user, token) = await CreateUserAndLoginAsync();

        // Act - Attempt to access a GlobalAdmin-only endpoint (GET /users requires GlobalAdmin)
        var request = new HttpRequestMessage(HttpMethod.Get, "/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        // Assert - Should return 403 Forbidden
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        // Verify audit event includes detailed context
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuthorizationDeniedAuditEventAsync(
            auditService,
            actorUserId: user.Id,
            resourceName: "/users");

        Assert.NotNull(auditEvent);

        // Verify detailed audit event
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.NotNull(details.Details);

        // Details should include request context (as JSON)
        Assert.Contains("GET", details.Details);
        Assert.Contains("users", details.Details);
        Assert.Contains("userRoles", details.Details);

        _output.WriteLine($"Audit event details: {details.Details}");
    }
}
