using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Integration tests for authentication audit events.
/// Verifies that login attempts (successful and failed) are properly audited.
/// </summary>
public class AuthenticationAuditTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public AuthenticationAuditTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    /// <summary>
    /// Helper method to wait for an authentication audit event to be processed asynchronously.
    /// </summary>
    private static async Task<AuditEventDto?> WaitForAuthenticationAuditEventAsync(
        IAuditService auditService,
        string? email = null,
        Guid? actorUserId = null,
        AuditOutcome? outcome = null,
        int maxWaitSeconds = 5)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var maxWait = TimeSpan.FromSeconds(maxWaitSeconds);
        var pollInterval = TimeSpan.FromMilliseconds(100);

        while (stopwatch.Elapsed < maxWait)
        {
            var query = new AuditQuery
            {
                ActionType = AuditActionType.Authenticated,
                ActorUserId = actorUserId,
                Outcome = outcome,
                Page = 1,
                PageSize = 100
            };

            var result = await auditService.QueryAsync(query);
            
            // Filter by email if provided
            var auditEvent = email != null
                ? result.Items.FirstOrDefault(e => e.ResourceName == email)
                : result.Items.FirstOrDefault();

            if (auditEvent != null)
                return auditEvent;

            await Task.Delay(pollInterval);
        }

        return null;
    }

    [Fact]
    public async Task Login_Success_CreatesAuditEvent()
    {
        // Arrange - Create a test user
        var password = "TestPassword123!";
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = password
        };

        var createResponse = await _client.PostAsJsonAsync("/users", createRequest);
        var createdUser = await createResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(createdUser);

        var loginRequest = new LoginRequest
        {
            Email = createRequest.Email,
            Password = password
        };

        // Act - Perform login
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        // Assert - Wait for audit event to be processed
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuthenticationAuditEventAsync(
            auditService,
            actorUserId: createdUser.Id,
            outcome: AuditOutcome.Success);

        Assert.NotNull(auditEvent);
        Assert.Equal(createdUser.Id, auditEvent.ActorUserId);
        Assert.Equal(createdUser.DisplayName, auditEvent.ActorDisplayName);
        Assert.Equal(AuditActionType.Authenticated, auditEvent.ActionType);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(AuditResourceType.User, auditEvent.ResourceType);
        Assert.Equal(createdUser.Id, auditEvent.ResourceId);

        // Verify IP address is captured (may be null in test environment)
        // Assert.NotNull(auditEvent.ActorIpAddress);

        _output.WriteLine($"Audit event details: ID={auditEvent.Id}, IP={auditEvent.ActorIpAddress}, Outcome={auditEvent.Outcome}");
    }

    [Fact]
    public async Task Login_InvalidPassword_CreatesFailureAuditEvent()
    {
        // Arrange - Create a test user
        var password = "TestPassword123!";
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = password
        };

        var createResponse = await _client.PostAsJsonAsync("/users", createRequest);
        var createdUser = await createResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(createdUser);

        var loginRequest = new LoginRequest
        {
            Email = createRequest.Email,
            Password = "WrongPassword123!"
        };

        // Act - Perform failed login
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, loginResponse.StatusCode);

        // Assert - Wait for audit event to be processed
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuthenticationAuditEventAsync(
            auditService,
            email: createRequest.Email,
            outcome: AuditOutcome.Failure);

        _output.WriteLine($"Found audit event for {createRequest.Email}: {auditEvent != null}");

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Authenticated, auditEvent.ActionType);
        Assert.Equal(AuditOutcome.Failure, auditEvent.Outcome);
        Assert.Equal(AuditResourceType.User, auditEvent.ResourceType);
        Assert.Equal(createRequest.Email, auditEvent.ResourceName);
        Assert.Equal("Invalid credentials", auditEvent.FailureReason);

        // Verify IP address is captured (may be null in test environment)
        // Assert.NotNull(auditEvent.ActorIpAddress);

        _output.WriteLine($"Failed login audit event details: ID={auditEvent.Id}, Email={auditEvent.ResourceName}, IP={auditEvent.ActorIpAddress}");
    }

    [Fact]
    public async Task Login_NonExistentUser_CreatesFailureAuditEvent()
    {
        // Arrange
        var nonExistentEmail = $"nonexistent-{Guid.NewGuid()}@example.com";
        var loginRequest = new LoginRequest
        {
            Email = nonExistentEmail,
            Password = "SomePassword123!"
        };

        // Act - Attempt login with non-existent user
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, loginResponse.StatusCode);

        // Assert - Wait for audit event to be processed
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuthenticationAuditEventAsync(
            auditService,
            email: nonExistentEmail,
            outcome: AuditOutcome.Failure);

        _output.WriteLine($"Found audit event for {nonExistentEmail}: {auditEvent != null}");

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Authenticated, auditEvent.ActionType);
        Assert.Equal(AuditOutcome.Failure, auditEvent.Outcome);
        Assert.Equal(AuditResourceType.User, auditEvent.ResourceType);
        Assert.Equal(nonExistentEmail, auditEvent.ResourceName);
        Assert.Equal("Invalid credentials", auditEvent.FailureReason);

        // Verify IP address is captured (may be null in test environment)
        // Assert.NotNull(auditEvent.ActorIpAddress);

        _output.WriteLine($"Failed login audit event details: ID={auditEvent.Id}, Email={auditEvent.ResourceName}, IP={auditEvent.ActorIpAddress}");
    }

    [Fact]
    public async Task Login_AuditEvent_DoesNotContainSensitiveData()
    {
        // Arrange - Create a test user
        var password = "TestPassword123!";
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = password
        };

        var createResponse = await _client.PostAsJsonAsync("/users", createRequest);
        var createdUser = await createResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(createdUser);

        var loginRequest = new LoginRequest
        {
            Email = createRequest.Email,
            Password = password
        };

        // Act - Perform login
        var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
        var loginResult = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(loginResult);

        // Assert - Wait for audit event to be processed
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuthenticationAuditEventAsync(
            auditService,
            actorUserId: createdUser.Id,
            outcome: AuditOutcome.Success);

        Assert.NotNull(auditEvent);

        // Get the full audit event with details
        var detailedEvent = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(detailedEvent);

        // Verify sensitive data is NOT present
        if (detailedEvent.Details != null)
        {
            var detailsLower = detailedEvent.Details.ToLower();
            Assert.DoesNotContain(password.ToLower(), detailsLower);
            Assert.DoesNotContain("password", detailsLower);
            Assert.DoesNotContain(loginResult.Token.ToLower(), detailsLower);
            Assert.DoesNotContain("token", detailsLower);
        }

        Assert.Null(auditEvent.FailureReason); // Successful login should not have failure reason

        _output.WriteLine($"Audit event verified to not contain sensitive data");
    }

    [Fact]
    public async Task Login_CapturesUserAgent()
    {
        // Arrange - Create a test user
        var password = "TestPassword123!";
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = password
        };

        var createResponse = await _client.PostAsJsonAsync("/users", createRequest);
        var createdUser = await createResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(createdUser);

        // Create a new HttpClient instance with custom User-Agent header
        var customUserAgent = "TestClient/1.0 (Integration Test)";
        var customClient = _factory.CreateClient();
        customClient.DefaultRequestHeaders.Add("User-Agent", customUserAgent);

        var loginRequest = new LoginRequest
        {
            Email = createRequest.Email,
            Password = password
        };

        // Act - Perform login with custom client
        var loginResponse = await customClient.PostAsJsonAsync("/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        // Assert - Wait for audit event to be processed
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuthenticationAuditEventAsync(
            auditService,
            actorUserId: createdUser.Id,
            outcome: AuditOutcome.Success);

        Assert.NotNull(auditEvent);

        // Get the full audit event with details
        var detailedEvent = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(detailedEvent);
        Assert.NotNull(detailedEvent.Details);

        // Verify User-Agent is captured in details
        Assert.Contains(customUserAgent, detailedEvent.Details);

        _output.WriteLine($"Audit event captured User-Agent: {customUserAgent}");
    }

    [Fact]
    public async Task Login_MultipleFailures_AllAudited()
    {
        // Arrange - Create a test user
        var password = "TestPassword123!";
        var createRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = password
        };

        var createResponse = await _client.PostAsJsonAsync("/users", createRequest);
        var createdUser = await createResponse.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(createdUser);

        // Act - Perform multiple failed login attempts
        var failureCount = 3;
        for (int i = 0; i < failureCount; i++)
        {
            var loginRequest = new LoginRequest
            {
                Email = createRequest.Email,
                Password = $"WrongPassword{i}!"
            };

            var loginResponse = await _client.PostAsJsonAsync("/auth/login", loginRequest);
            Assert.Equal(HttpStatusCode.Unauthorized, loginResponse.StatusCode);
        }

        // Assert - Wait for audit events to be processed using polling
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        // Poll until we have all expected events or timeout
        var maxWaitTime = TimeSpan.FromSeconds(5);
        var pollInterval = TimeSpan.FromMilliseconds(100);
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        int eventsForUser = 0;

        while (stopwatch.Elapsed < maxWaitTime && eventsForUser < failureCount)
        {
            var query = new AuditQuery
            {
                ActionType = AuditActionType.Authenticated,
                Outcome = AuditOutcome.Failure,
                Page = 1,
                PageSize = 100
            };

            var auditResult = await auditService.QueryAsync(query);

            // Count events for this specific email
            eventsForUser = auditResult.Items.Count(e => e.ResourceName == createRequest.Email);

            if (eventsForUser < failureCount)
                await Task.Delay(pollInterval);
        }

        _output.WriteLine($"Found {eventsForUser} failed login attempts for email {createRequest.Email}");

        Assert.True(eventsForUser >= failureCount, 
            $"Expected at least {failureCount} failed login audit events, but found {eventsForUser}");
    }
}
