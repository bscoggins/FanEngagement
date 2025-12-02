using System.Net.Http.Json;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Integration tests for share management audit events.
/// Verifies that all share type and share issuance operations generate appropriate audit events.
/// </summary>
public class ShareManagementAuditTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public ShareManagementAuditTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateShareType_GeneratesAuditEvent_WithCorrectDetails()
    {
        // Arrange
        var (organization, adminToken, adminUserId) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateShareTypeRequest
        {
            Name = "Test Shares",
            Symbol = "TST",
            Description = "Test share type",
            VotingWeight = 2.5m,
            MaxSupply = 1000m,
            IsTransferable = true
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/share-types", request);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "ShareType creation should succeed");
        var shareType = await response.Content.ReadFromJsonAsync<ShareType>();
        Assert.NotNull(shareType);

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.ShareType,
            shareType!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Created, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.ShareType, auditEvent.ResourceType);
        Assert.Equal(shareType.Id, auditEvent.ResourceId);
        Assert.Equal(shareType.Name, auditEvent.ResourceName);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(organization.Id, auditEvent.OrganizationId);
        Assert.Equal(adminUserId, auditEvent.ActorUserId);

        // Verify details contain share type properties
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;
        Assert.Contains("\"name\":", detailsJson);
        Assert.Contains("Test Shares", detailsJson);
        Assert.Contains("\"symbol\":", detailsJson);
        Assert.Contains("TST", detailsJson);
        Assert.Contains("\"votingWeight\":", detailsJson);
        Assert.Contains("2.5", detailsJson);
        Assert.Contains("\"maxSupply\":", detailsJson);
        Assert.Contains("1000", detailsJson);
        Assert.Contains("\"isTransferable\":", detailsJson);
        Assert.Contains("true", detailsJson);
    }

    [Fact]
    public async Task UpdateShareType_GeneratesAuditEvent_WithBeforeAfterValues()
    {
        // Arrange
        var (organization, adminToken, adminUserId) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create share type first
        var createRequest = new CreateShareTypeRequest
        {
            Name = "Original Name",
            Symbol = "ORG",
            Description = "Original description",
            VotingWeight = 1.0m,
            MaxSupply = 500m,
            IsTransferable = false
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/share-types", createRequest);
        var shareType = await createResponse.Content.ReadFromJsonAsync<ShareType>();
        Assert.NotNull(shareType);

        // Wait a moment for the create audit to complete
        await Task.Delay(200);

        // Act - Update the share type
        var updateRequest = new UpdateShareTypeRequest
        {
            Name = "Updated Name",
            Symbol = "UPD",
            Description = "Updated description",
            VotingWeight = 2.0m,
            MaxSupply = 1000m,
            IsTransferable = true
        };
        var response = await _client.PutAsJsonAsync($"/organizations/{organization.Id}/share-types/{shareType!.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "ShareType update should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.ShareType,
            shareType.Id,
            AuditActionType.Updated);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Updated, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.ShareType, auditEvent.ResourceType);
        Assert.Equal(shareType.Id, auditEvent.ResourceId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(organization.Id, auditEvent.OrganizationId);
        Assert.Equal(adminUserId, auditEvent.ActorUserId);

        // Verify details contain before/after values
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;
        
        // Check for changes tracking
        Assert.Contains("\"changes\":", detailsJson);
        
        // Check for before values
        Assert.Contains("\"beforeValues\":", detailsJson);
        Assert.Contains("Original Name", detailsJson);
        Assert.Contains("ORG", detailsJson);
        
        // Check for after values
        Assert.Contains("\"afterValues\":", detailsJson);
        Assert.Contains("Updated Name", detailsJson);
        Assert.Contains("UPD", detailsJson);
    }

    [Fact]
    public async Task CreateShareIssuance_GeneratesAuditEvent_WithVotingPowerDetails()
    {
        // Arrange
        var (organization, adminToken, adminUserId) = await CreateTestOrganizationAsync();
        var targetUser = await CreateTestUserAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Add user as member
        var membershipRequest = new CreateMembershipRequest
        {
            UserId = targetUser.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{organization.Id}/memberships", membershipRequest);

        // Create share type
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Voting Shares",
            Symbol = "VOTE",
            Description = "Shares with voting power",
            VotingWeight = 3.0m,
            MaxSupply = null,
            IsTransferable = true
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/share-types", shareTypeRequest);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();
        Assert.NotNull(shareType);

        // Wait for previous audit events to complete
        await Task.Delay(200);

        // Act - Issue shares
        var issuanceRequest = new CreateShareIssuanceRequest
        {
            UserId = targetUser.Id,
            ShareTypeId = shareType!.Id,
            Quantity = 100m,
            Reason = "Initial allocation"
        };
        var response = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/share-issuances", issuanceRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "ShareIssuance creation should succeed");
        var issuance = await response.Content.ReadFromJsonAsync<ShareIssuanceDto>();
        Assert.NotNull(issuance);

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.ShareIssuance,
            issuance!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Created, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.ShareIssuance, auditEvent.ResourceType);
        Assert.Equal(issuance.Id, auditEvent.ResourceId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(organization.Id, auditEvent.OrganizationId);
        Assert.Equal(adminUserId, auditEvent.ActorUserId);

        // Verify details contain recipient, share type, and voting power information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;
        
        Assert.Contains("\"recipientUserId\":", detailsJson);
        Assert.Contains(targetUser.Id.ToString(), detailsJson);
        Assert.Contains("\"recipientName\":", detailsJson);
        Assert.Contains(targetUser.DisplayName, detailsJson);
        Assert.Contains("\"recipientEmail\":", detailsJson);
        Assert.Contains(targetUser.Email, detailsJson);
        
        Assert.Contains("\"shareTypeId\":", detailsJson);
        Assert.Contains(shareType.Id.ToString(), detailsJson);
        Assert.Contains("\"shareTypeName\":", detailsJson);
        Assert.Contains("Voting Shares", detailsJson);
        Assert.Contains("\"shareTypeSymbol\":", detailsJson);
        Assert.Contains("VOTE", detailsJson);
        
        Assert.Contains("\"quantity\":", detailsJson);
        Assert.Contains("100", detailsJson);
        Assert.Contains("\"votingWeightPerShare\":", detailsJson);
        Assert.Contains("3", detailsJson);
        Assert.Contains("\"totalVotingPowerAdded\":", detailsJson);
        Assert.Contains("300", detailsJson); // 100 shares * 3.0 voting weight
        
        Assert.Contains("\"issuerId\":", detailsJson);
        Assert.Contains(adminUserId.ToString(), detailsJson);
        Assert.Contains("\"issuerName\":", detailsJson);
    }

    [Fact]
    public async Task AllShareManagementAuditEvents_ContainRequiredFields()
    {
        // Arrange
        var (organization, adminToken, _) = await CreateTestOrganizationAsync();
        var targetUser = await CreateTestUserAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Add user as member
        var membershipRequest = new CreateMembershipRequest
        {
            UserId = targetUser.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{organization.Id}/memberships", membershipRequest);

        // Create share type
        var createShareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Shares",
            Symbol = "TST",
            Description = "Test",
            VotingWeight = 1.0m,
            MaxSupply = null,
            IsTransferable = true
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/share-types", createShareTypeRequest);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();
        Assert.NotNull(shareType);

        await Task.Delay(200);

        // Update share type
        var updateShareTypeRequest = new UpdateShareTypeRequest
        {
            Name = "Updated Shares",
            Symbol = "UPD",
            Description = "Updated",
            VotingWeight = 2.0m,
            MaxSupply = null,
            IsTransferable = true
        };
        await _client.PutAsJsonAsync($"/organizations/{organization.Id}/share-types/{shareType!.Id}", updateShareTypeRequest);

        await Task.Delay(200);

        // Issue shares
        var issuanceRequest = new CreateShareIssuanceRequest
        {
            UserId = targetUser.Id,
            ShareTypeId = shareType.Id,
            Quantity = 50m
        };
        var issuanceResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/share-issuances", issuanceRequest);
        var issuance = await issuanceResponse.Content.ReadFromJsonAsync<ShareIssuanceDto>();
        Assert.NotNull(issuance);

        // Wait for all audit events to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.ShareIssuance,
            issuance!.Id,
            AuditActionType.Created);

        // Query all share-related audit events for this organization
        var query = new AuditQuery
        {
            OrganizationId = organization.Id,
            Page = 1,
            PageSize = 50
        };

        var result = await auditService.QueryAsync(query);

        // Filter to share-related events
        var shareTypeEvents = result.Items.Where(e => e.ResourceType == AuditResourceType.ShareType).ToList();
        var shareIssuanceEvents = result.Items.Where(e => e.ResourceType == AuditResourceType.ShareIssuance).ToList();

        Assert.True(shareTypeEvents.Count >= 2, $"Expected at least 2 ShareType audit events, got {shareTypeEvents.Count}");
        Assert.True(shareIssuanceEvents.Count >= 1, $"Expected at least 1 ShareIssuance audit event, got {shareIssuanceEvents.Count}");

        // Verify all events have required fields
        foreach (var evt in shareTypeEvents.Concat(shareIssuanceEvents))
        {
            Assert.NotEqual(Guid.Empty, evt.Id);
            Assert.True(evt.Timestamp > DateTimeOffset.MinValue);
            Assert.True(evt.ResourceType == AuditResourceType.ShareType || evt.ResourceType == AuditResourceType.ShareIssuance);
            Assert.NotEqual(Guid.Empty, evt.ResourceId);
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
    private async Task<UserDto> CreateTestUserAsync()
    {
        var createUserRequest = new CreateUserRequest
        {
            Email = $"test-user-{Guid.NewGuid()}@example.com",
            DisplayName = $"Test User {Guid.NewGuid().ToString()[..8]}",
            Password = "TestPassword123!"
        };

        var response = await _client.PostAsJsonAsync("/users", createUserRequest);
        var user = await response.Content.ReadFromJsonAsync<UserDto>();
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
