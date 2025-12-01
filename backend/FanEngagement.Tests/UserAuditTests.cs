using System.Net.Http.Json;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Integration tests for user management audit events.
/// Verifies that all user CRUD operations generate appropriate audit events.
/// </summary>
public class UserAuditTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public UserAuditTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateUser_GeneratesAuditEvent_WithCorrectDetails()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Email = $"audit-test-{Guid.NewGuid()}@example.com",
            DisplayName = "Audit Test User",
            Password = "SecurePassword123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users", request);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "User creation should succeed");
        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(user);

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.User,
            user!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Created, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.User, auditEvent.ResourceType);
        Assert.Equal(user.Id, auditEvent.ResourceId);
        Assert.Equal(user.DisplayName, auditEvent.ResourceName);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);

        // Verify details contain email and displayName but NOT password
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains(request.Email, details!.Details ?? string.Empty);
        Assert.Contains(request.DisplayName, details.Details ?? string.Empty);
        Assert.DoesNotContain("password", details.Details ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("SecurePassword123!", details.Details ?? string.Empty);
    }

    [Fact]
    public async Task UpdateUser_WithProfileChanges_GeneratesAuditEvent()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var updateRequest = new UpdateUserRequest
        {
            Email = $"updated-{Guid.NewGuid()}@example.com",
            DisplayName = "Updated Display Name"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{user.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "User update should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.User,
            user.Id,
            AuditActionType.Updated);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Updated, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.User, auditEvent.ResourceType);
        Assert.Equal(user.Id, auditEvent.ResourceId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);

        // Verify details contain before/after values
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains("oldEmail", details!.Details ?? string.Empty);
        Assert.Contains("newEmail", details.Details ?? string.Empty);
        Assert.Contains("oldDisplayName", details.Details ?? string.Empty);
        Assert.Contains("newDisplayName", details.Details ?? string.Empty);
        Assert.Contains(user.Email, details.Details ?? string.Empty);
        Assert.Contains(updateRequest.Email, details.Details ?? string.Empty);
    }

    [Fact]
    public async Task UpdateUser_WithRoleChange_GeneratesTwoAuditEvents()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var updateRequest = new UpdateUserRequest
        {
            Email = user.Email,
            DisplayName = user.DisplayName,
            Role = UserRole.Admin // Privilege escalation
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{user.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "User role update should succeed");

        // Wait for audit events to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        // Should have both RoleChanged and Updated events
        var roleChangedEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.User,
            user.Id,
            AuditActionType.RoleChanged);

        var updatedEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.User,
            user.Id,
            AuditActionType.Updated);

        Assert.NotNull(roleChangedEvent);
        Assert.NotNull(updatedEvent);

        // Verify RoleChanged event details
        var roleChangedDetails = await auditService.GetByIdAsync(roleChangedEvent.Id);
        Assert.NotNull(roleChangedDetails);
        Assert.Contains("oldRole", roleChangedDetails!.Details ?? string.Empty);
        Assert.Contains("newRole", roleChangedDetails.Details ?? string.Empty);
        Assert.Contains("User", roleChangedDetails.Details ?? string.Empty); // Old role
        Assert.Contains("Admin", roleChangedDetails.Details ?? string.Empty); // New role
    }

    [Fact]
    public async Task UpdateUser_WithEmailAndRoleChange_GeneratesBothEvents()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var newEmail = $"changed-{Guid.NewGuid()}@example.com";
        var updateRequest = new UpdateUserRequest
        {
            Email = newEmail,
            DisplayName = user.DisplayName,
            Role = UserRole.Admin
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/users/{user.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "User update should succeed");

        // Wait for audit events
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var roleChangedEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.User,
            user.Id,
            AuditActionType.RoleChanged);

        var updatedEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.User,
            user.Id,
            AuditActionType.Updated);

        Assert.NotNull(roleChangedEvent);
        Assert.NotNull(updatedEvent);

        // Verify Updated event includes email change
        var updatedDetails = await auditService.GetByIdAsync(updatedEvent.Id);
        Assert.NotNull(updatedDetails);
        Assert.Contains("oldEmail", updatedDetails!.Details ?? string.Empty);
        Assert.Contains("newEmail", updatedDetails.Details ?? string.Empty);
        Assert.Contains(newEmail, updatedDetails.Details ?? string.Empty);
    }

    [Fact]
    public async Task DeleteUser_GeneratesAuditEvent()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act
        var response = await _client.DeleteAsync($"/users/{user.Id}");

        // Assert
        Assert.True(response.IsSuccessStatusCode, "User deletion should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.User,
            user.Id,
            AuditActionType.Deleted);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Deleted, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.User, auditEvent.ResourceType);
        Assert.Equal(user.Id, auditEvent.ResourceId);
        Assert.Equal(user.DisplayName, auditEvent.ResourceName);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);

        // Verify details contain user information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains(user.Email, details!.Details ?? string.Empty);
        Assert.Contains(user.DisplayName, details.Details ?? string.Empty);
    }

    [Fact]
    public async Task AllUserAuditEvents_ContainRequiredFields()
    {
        // Arrange
        var (user, _) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Update and delete to generate multiple events
        var updateRequest = new UpdateUserRequest
        {
            Email = $"verify-{Guid.NewGuid()}@example.com",
            DisplayName = "Verification User"
        };
        await _client.PutAsJsonAsync($"/users/{user.Id}", updateRequest);
        await _client.DeleteAsync($"/users/{user.Id}");

        // Wait and query all events for this user
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        await Task.Delay(2000); // Give time for background processing

        var query = new AuditQuery
        {
            ResourceType = AuditResourceType.User,
            ResourceId = user.Id,
            Page = 1,
            PageSize = 50
        };

        var result = await auditService.QueryAsync(query);

        // Assert - should have at least Created, Updated, and Deleted events
        Assert.True(result.TotalCount >= 3, $"Expected at least 3 audit events, got {result.TotalCount}");

        // Verify all events have required fields
        foreach (var evt in result.Items)
        {
            Assert.NotEqual(Guid.Empty, evt.Id);
            Assert.True(evt.Timestamp > DateTimeOffset.MinValue);
            Assert.Equal(AuditResourceType.User, evt.ResourceType);
            Assert.Equal(user.Id, evt.ResourceId);
            Assert.True(Enum.IsDefined(typeof(AuditOutcome), evt.Outcome));
            // CorrelationId is optional but should be present if set by middleware
        }
    }

    [Fact]
    public async Task UserAuditEvents_DoNotContainSensitiveData()
    {
        // Arrange
        var password = "VerySecretPassword123!";
        var request = new CreateUserRequest
        {
            Email = $"security-test-{Guid.NewGuid()}@example.com",
            DisplayName = "Security Test User",
            Password = password
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users", request);
        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(user);

        // Wait for audit event
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.User,
            user!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);

        // Get full details
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);

        // Assert - password should NOT be in details
        var detailsJson = details!.Details ?? string.Empty;
        Assert.DoesNotContain("password", detailsJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(password, detailsJson);
        Assert.DoesNotContain("VerySecret", detailsJson);
        Assert.DoesNotContain("PasswordHash", detailsJson);
        Assert.DoesNotContain("hash", detailsJson, StringComparison.OrdinalIgnoreCase);

        // Should contain non-sensitive data
        Assert.Contains(request.Email, detailsJson);
        Assert.Contains(request.DisplayName, detailsJson);
    }

    /// <summary>
    /// Helper method to wait for an audit event to be persisted by the background service.
    /// Polls the audit service for up to 5 seconds.
    /// </summary>
    private static async Task<AuditEventDto?> WaitForAuditEventAsync(
        IAuditService auditService,
        AuditResourceType resourceType,
        Guid resourceId,
        AuditActionType actionType,
        int maxWaitSeconds = 5)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var maxWait = TimeSpan.FromSeconds(maxWaitSeconds);
        var pollInterval = TimeSpan.FromMilliseconds(100);

        while (stopwatch.Elapsed < maxWait)
        {
            var query = new AuditQuery
            {
                ResourceType = resourceType,
                ResourceId = resourceId,
                ActionType = actionType,
                Page = 1,
                PageSize = 10
            };

            var result = await auditService.QueryAsync(query);
            var auditEvent = result.Items.FirstOrDefault();

            if (auditEvent != null)
            {
                return auditEvent;
            }

            await Task.Delay(pollInterval);
        }

        return null;
    }
}
