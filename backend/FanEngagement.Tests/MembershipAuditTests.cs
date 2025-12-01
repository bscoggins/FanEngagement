using System.Net.Http.Json;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Integration tests for membership management audit events.
/// Verifies that all membership operations generate appropriate audit events.
/// </summary>
public class MembershipAuditTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public MembershipAuditTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateMembership_GeneratesAuditEvent_WithCorrectDetails()
    {
        // Arrange
        var (organization, adminToken, adminUserId) = await CreateTestOrganizationAsync();
        var targetUser = await CreateTestUserAsync();
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateMembershipRequest
        {
            UserId = targetUser.Id,
            Role = OrganizationRole.Member
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/memberships", request);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Membership creation should succeed");
        var membership = await response.Content.ReadFromJsonAsync<MembershipDto>();
        Assert.NotNull(membership);

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Membership,
            membership!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Created, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.Membership, auditEvent.ResourceType);
        Assert.Equal(membership.Id, auditEvent.ResourceId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(organization.Id, auditEvent.OrganizationId);

        // Verify details contain target user and inviter information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;
        Assert.Contains("targetUserId", detailsJson);
        Assert.Contains(targetUser.Id.ToString(), detailsJson);
        Assert.Contains("targetUserName", detailsJson);
        Assert.Contains(targetUser.DisplayName, detailsJson);
        Assert.Contains("targetUserEmail", detailsJson);
        Assert.Contains(targetUser.Email, detailsJson);
        Assert.Contains("inviterUserId", detailsJson);
        Assert.Contains(adminUserId.ToString(), detailsJson);
        Assert.Contains("role", detailsJson);
        Assert.Contains("Member", detailsJson);
    }

    [Fact]
    public async Task DeleteMembership_GeneratesAuditEvent_WithCorrectDetails()
    {
        // Arrange
        var (organization, adminToken, adminUserId) = await CreateTestOrganizationAsync();
        var targetUser = await CreateTestUserAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create membership first
        var createRequest = new CreateMembershipRequest
        {
            UserId = targetUser.Id,
            Role = OrganizationRole.Member
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/memberships", createRequest);
        var membership = await createResponse.Content.ReadFromJsonAsync<MembershipDto>();
        Assert.NotNull(membership);

        // Wait a moment for the create audit to complete
        await Task.Delay(200);

        // Act - Delete the membership
        var response = await _client.DeleteAsync($"/organizations/{organization.Id}/memberships/{targetUser.Id}");

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Membership deletion should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Membership,
            membership!.Id,
            AuditActionType.Deleted);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Deleted, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.Membership, auditEvent.ResourceType);
        Assert.Equal(membership.Id, auditEvent.ResourceId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(organization.Id, auditEvent.OrganizationId);

        // Verify details contain target user and remover information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;
        Assert.Contains("targetUserId", detailsJson);
        Assert.Contains(targetUser.Id.ToString(), detailsJson);
        Assert.Contains("targetUserName", detailsJson);
        Assert.Contains(targetUser.DisplayName, detailsJson);
        Assert.Contains("removedByUserId", detailsJson);
        Assert.Contains(adminUserId.ToString(), detailsJson);
    }

    [Fact]
    public async Task UpdateMembershipRole_GeneratesAuditEvent_WithCorrectDetails()
    {
        // Arrange
        var (organization, adminToken, adminUserId) = await CreateTestOrganizationAsync();
        var targetUser = await CreateTestUserAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create membership first as Member
        var createRequest = new CreateMembershipRequest
        {
            UserId = targetUser.Id,
            Role = OrganizationRole.Member
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/memberships", createRequest);
        var membership = await createResponse.Content.ReadFromJsonAsync<MembershipDto>();
        Assert.NotNull(membership);

        // Wait a moment for the create audit to complete
        await Task.Delay(200);

        // Act - Update role to OrgAdmin
        var updateRequest = new UpdateMembershipRequest
        {
            Role = OrganizationRole.OrgAdmin
        };
        var response = await _client.PutAsJsonAsync($"/organizations/{organization.Id}/memberships/{targetUser.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Membership role update should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Membership,
            membership!.Id,
            AuditActionType.RoleChanged);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.RoleChanged, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.Membership, auditEvent.ResourceType);
        Assert.Equal(membership.Id, auditEvent.ResourceId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(organization.Id, auditEvent.OrganizationId);

        // Verify details contain role change information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;
        Assert.Contains("targetUserId", detailsJson);
        Assert.Contains(targetUser.Id.ToString(), detailsJson);
        Assert.Contains("oldRole", detailsJson);
        Assert.Contains("Member", detailsJson);
        Assert.Contains("newRole", detailsJson);
        Assert.Contains("OrgAdmin", detailsJson);
        Assert.Contains("changedByUserId", detailsJson);
        Assert.Contains(adminUserId.ToString(), detailsJson);
    }

    [Fact]
    public async Task UpdateMembershipRole_ToHigherPrivilege_FlagsPrivilegeEscalation()
    {
        // Arrange
        var (organization, adminToken, adminUserId) = await CreateTestOrganizationAsync();
        var targetUser = await CreateTestUserAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create membership first as Member
        var createRequest = new CreateMembershipRequest
        {
            UserId = targetUser.Id,
            Role = OrganizationRole.Member
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/memberships", createRequest);
        var membership = await createResponse.Content.ReadFromJsonAsync<MembershipDto>();
        Assert.NotNull(membership);

        // Wait a moment for the create audit to complete
        await Task.Delay(200);

        // Act - Escalate privilege from Member to OrgAdmin
        var updateRequest = new UpdateMembershipRequest
        {
            Role = OrganizationRole.OrgAdmin
        };
        var response = await _client.PutAsJsonAsync($"/organizations/{organization.Id}/memberships/{targetUser.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Membership role update should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Membership,
            membership!.Id,
            AuditActionType.RoleChanged);

        Assert.NotNull(auditEvent);

        // Verify privilege escalation is flagged
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;
        Assert.Contains("isPrivilegeEscalation", detailsJson);
        Assert.Contains("\"isPrivilegeEscalation\":true", detailsJson);
    }

    [Fact]
    public async Task UpdateMembershipRole_ToLowerPrivilege_DoesNotFlagPrivilegeEscalation()
    {
        // Arrange
        var (organization, adminToken, adminUserId) = await CreateTestOrganizationAsync();
        var targetUser = await CreateTestUserAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create membership first as OrgAdmin
        var createRequest = new CreateMembershipRequest
        {
            UserId = targetUser.Id,
            Role = OrganizationRole.OrgAdmin
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/memberships", createRequest);
        var membership = await createResponse.Content.ReadFromJsonAsync<MembershipDto>();
        Assert.NotNull(membership);

        // Wait a moment for the create audit to complete
        await Task.Delay(200);

        // Act - Demote from OrgAdmin to Member
        var updateRequest = new UpdateMembershipRequest
        {
            Role = OrganizationRole.Member
        };
        var response = await _client.PutAsJsonAsync($"/organizations/{organization.Id}/memberships/{targetUser.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Membership role update should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Membership,
            membership!.Id,
            AuditActionType.RoleChanged);

        Assert.NotNull(auditEvent);

        // Verify privilege escalation is NOT flagged
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;
        Assert.Contains("isPrivilegeEscalation", detailsJson);
        Assert.Contains("\"isPrivilegeEscalation\":false", detailsJson);
    }

    [Fact]
    public async Task UpdateMembershipRole_WithNoChange_DoesNotGenerateAuditEvent()
    {
        // Arrange
        var (organization, adminToken, adminUserId) = await CreateTestOrganizationAsync();
        var targetUser = await CreateTestUserAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create membership as Member
        var createRequest = new CreateMembershipRequest
        {
            UserId = targetUser.Id,
            Role = OrganizationRole.Member
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/memberships", createRequest);
        var membership = await createResponse.Content.ReadFromJsonAsync<MembershipDto>();
        Assert.NotNull(membership);

        // Wait for create audit to complete
        await Task.Delay(200);

        // Act - Update to the same role (Member)
        var updateRequest = new UpdateMembershipRequest
        {
            Role = OrganizationRole.Member
        };
        var response = await _client.PutAsJsonAsync($"/organizations/{organization.Id}/memberships/{targetUser.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Membership role update should succeed");

        // Wait a bit and verify no RoleChanged audit event was created
        await Task.Delay(200);

        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var query = new AuditQuery
        {
            ResourceType = AuditResourceType.Membership,
            ResourceId = membership!.Id,
            ActionType = AuditActionType.RoleChanged,
            Page = 1,
            PageSize = 10
        };

        var result = await auditService.QueryAsync(query);

        // Should not have any RoleChanged audit events
        Assert.Equal(0, result.TotalCount);
    }

    [Fact]
    public async Task AllMembershipAuditEvents_ContainRequiredFields()
    {
        // Arrange
        var (organization, adminToken, adminUserId) = await CreateTestOrganizationAsync();
        var targetUser = await CreateTestUserAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create membership
        var createRequest = new CreateMembershipRequest
        {
            UserId = targetUser.Id,
            Role = OrganizationRole.Member
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/memberships", createRequest);
        var membership = await createResponse.Content.ReadFromJsonAsync<MembershipDto>();
        Assert.NotNull(membership);

        // Wait for create audit
        await Task.Delay(200);

        // Update role
        var updateRequest = new UpdateMembershipRequest { Role = OrganizationRole.OrgAdmin };
        await _client.PutAsJsonAsync($"/organizations/{organization.Id}/memberships/{targetUser.Id}", updateRequest);

        // Wait for update audit
        await Task.Delay(200);

        // Delete membership
        await _client.DeleteAsync($"/organizations/{organization.Id}/memberships/{targetUser.Id}");

        // Wait for delete audit
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        // Wait for the delete event to ensure it's persisted
        await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Membership,
            membership!.Id,
            AuditActionType.Deleted);

        var query = new AuditQuery
        {
            ResourceType = AuditResourceType.Membership,
            ResourceId = membership.Id,
            Page = 1,
            PageSize = 50
        };

        var result = await auditService.QueryAsync(query);

        // Assert - should have Created, RoleChanged, and Deleted events
        Assert.True(result.TotalCount >= 3, $"Expected at least 3 audit events, got {result.TotalCount}");

        // Verify all events have required fields
        foreach (var evt in result.Items)
        {
            Assert.NotEqual(Guid.Empty, evt.Id);
            Assert.True(evt.Timestamp > DateTimeOffset.MinValue);
            Assert.Equal(AuditResourceType.Membership, evt.ResourceType);
            Assert.Equal(membership.Id, evt.ResourceId);
            Assert.Equal(organization.Id, evt.OrganizationId);
            Assert.True(Enum.IsDefined(typeof(AuditOutcome), evt.Outcome));
            Assert.NotEqual(Guid.Empty, evt.ActorUserId ?? Guid.Empty);
        }
    }

    /// <summary>
    /// Helper method to create a test organization and return it with an admin token and user ID.
    /// </summary>
    private async Task<(Organization Organization, string AdminToken, Guid AdminUserId)> CreateTestOrganizationAsync()
    {
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test organization",
            LogoUrl = "https://example.com/logo.png",
            PrimaryColor = "#FF0000",
            SecondaryColor = "#00FF00"
        };

        var response = await _client.PostAsJsonAsync("/organizations", request);
        var organization = await response.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        return (organization!, adminToken, adminUserId);
    }

    /// <summary>
    /// Helper method to create a test user.
    /// </summary>
    private async Task<Application.Users.UserDto> CreateTestUserAsync()
    {
        var createUserRequest = new Application.Users.CreateUserRequest
        {
            Email = $"test-user-{Guid.NewGuid()}@example.com",
            DisplayName = $"Test User {Guid.NewGuid().ToString()[..8]}",
            Password = "TestPassword123!"
        };

        var response = await _client.PostAsJsonAsync("/users", createUserRequest);
        var user = await response.Content.ReadFromJsonAsync<Application.Users.UserDto>();
        Assert.NotNull(user);
        return user!;
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
