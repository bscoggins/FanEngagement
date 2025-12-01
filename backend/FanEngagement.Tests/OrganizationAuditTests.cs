using System.Net.Http.Json;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Organizations;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Integration tests for organization management audit events.
/// Verifies that all organization CRUD operations generate appropriate audit events.
/// </summary>
public class OrganizationAuditTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public OrganizationAuditTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateOrganization_GeneratesAuditEvent_WithCorrectDetails()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = $"Audit Test Org {Guid.NewGuid()}",
            Description = "Test organization for audit",
            LogoUrl = "https://example.com/logo.png",
            PrimaryColor = "#FF0000",
            SecondaryColor = "#00FF00"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/organizations", request);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Organization creation should succeed");
        var organization = await response.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Organization,
            organization!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Created, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.Organization, auditEvent.ResourceType);
        Assert.Equal(organization.Id, auditEvent.ResourceId);
        Assert.Equal(organization.Name, auditEvent.ResourceName);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(organization.Id, auditEvent.OrganizationId);

        // Verify details contain organization information and branding
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains(request.Name, details!.Details ?? string.Empty);
        Assert.Contains(request.Description, details.Details ?? string.Empty);
        Assert.Contains(request.LogoUrl, details.Details ?? string.Empty);
        Assert.Contains(request.PrimaryColor, details.Details ?? string.Empty);
        Assert.Contains(request.SecondaryColor, details.Details ?? string.Empty);
        Assert.Contains("branding", details.Details ?? string.Empty);
    }

    [Fact]
    public async Task UpdateOrganization_WithNameChange_GeneratesAuditEvent()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var updateRequest = new UpdateOrganizationRequest
        {
            Name = $"Updated Org Name {Guid.NewGuid()}",
            Description = org.Description,
            LogoUrl = org.LogoUrl,
            PrimaryColor = org.PrimaryColor,
            SecondaryColor = org.SecondaryColor
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{org.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Organization update should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Organization,
            org.Id,
            AuditActionType.Updated);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Updated, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.Organization, auditEvent.ResourceType);
        Assert.Equal(org.Id, auditEvent.ResourceId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);

        // Verify details contain before/after values
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains("oldName", details!.Details ?? string.Empty);
        Assert.Contains("newName", details.Details ?? string.Empty);
        Assert.Contains("changedFields", details.Details ?? string.Empty);
        Assert.Contains(org.Name, details.Details ?? string.Empty);
        Assert.Contains(updateRequest.Name, details.Details ?? string.Empty);
        Assert.Contains("brandingChanged", details.Details ?? string.Empty);
        // Verify brandingChanged is false by checking it's not explicitly true in the context
        Assert.DoesNotContain("\"brandingChanged\":true", details.Details ?? string.Empty);
    }

    [Fact]
    public async Task UpdateOrganization_WithBrandingChanges_FlagsBrandingChanged()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var updateRequest = new UpdateOrganizationRequest
        {
            Name = org.Name,
            Description = org.Description,
            LogoUrl = "https://example.com/new-logo.png",
            PrimaryColor = "#0000FF",
            SecondaryColor = "#FFFF00"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{org.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Organization update should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Organization,
            org.Id,
            AuditActionType.Updated);

        Assert.NotNull(auditEvent);

        // Verify details show branding changes
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains("oldLogoUrl", details!.Details ?? string.Empty);
        Assert.Contains("newLogoUrl", details.Details ?? string.Empty);
        Assert.Contains("oldPrimaryColor", details.Details ?? string.Empty);
        Assert.Contains("newPrimaryColor", details.Details ?? string.Empty);
        Assert.Contains("oldSecondaryColor", details.Details ?? string.Empty);
        Assert.Contains("newSecondaryColor", details.Details ?? string.Empty);
        Assert.Contains("\"brandingChanged\":true", details.Details ?? string.Empty); // brandingChanged should be true
        Assert.Contains(updateRequest.LogoUrl, details.Details ?? string.Empty);
        Assert.Contains(updateRequest.PrimaryColor, details.Details ?? string.Empty);
        Assert.Contains(updateRequest.SecondaryColor, details.Details ?? string.Empty);
    }

    [Fact]
    public async Task UpdateOrganization_WithMixedChanges_TracksAllFields()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var updateRequest = new UpdateOrganizationRequest
        {
            Name = $"Updated Name {Guid.NewGuid()}",
            Description = "Updated description",
            LogoUrl = "https://example.com/updated-logo.png",
            PrimaryColor = "#123456",
            SecondaryColor = org.SecondaryColor
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{org.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Organization update should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Organization,
            org.Id,
            AuditActionType.Updated);

        Assert.NotNull(auditEvent);

        // Verify details contain all changed fields
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains("Name", details!.Details ?? string.Empty);
        Assert.Contains("Description", details.Details ?? string.Empty);
        Assert.Contains("LogoUrl", details.Details ?? string.Empty);
        Assert.Contains("PrimaryColor", details.Details ?? string.Empty);
        Assert.Contains("\"brandingChanged\":true", details.Details ?? string.Empty);
    }

    [Fact]
    public async Task UpdateOrganization_WithNoChanges_DoesNotGenerateAuditEvent()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var updateRequest = new UpdateOrganizationRequest
        {
            Name = org.Name,
            Description = org.Description,
            LogoUrl = org.LogoUrl,
            PrimaryColor = org.PrimaryColor,
            SecondaryColor = org.SecondaryColor
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{org.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Organization update should succeed");

        // Wait a bit and verify no update audit event was created
        await Task.Delay(200);

        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var query = new AuditQuery
        {
            ResourceType = AuditResourceType.Organization,
            ResourceId = org.Id,
            ActionType = AuditActionType.Updated,
            Page = 1,
            PageSize = 10
        };

        var result = await auditService.QueryAsync(query);

        // Should not have any Update audit events (only Created event should exist)
        Assert.Equal(0, result.TotalCount);
    }

    [Fact]
    public async Task AllOrganizationAuditEvents_ContainRequiredFields()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Update to generate more events
        var updateRequest = new UpdateOrganizationRequest
        {
            Name = $"Verification Org {Guid.NewGuid()}",
            Description = "Updated for verification",
            LogoUrl = org.LogoUrl,
            PrimaryColor = org.PrimaryColor,
            SecondaryColor = org.SecondaryColor
        };
        await _client.PutAsJsonAsync($"/organizations/{org.Id}", updateRequest);

        // Wait for update audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        // Wait for the update event to ensure it's persisted
        await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Organization,
            org.Id,
            AuditActionType.Updated);

        var query = new AuditQuery
        {
            ResourceType = AuditResourceType.Organization,
            ResourceId = org.Id,
            Page = 1,
            PageSize = 50
        };

        var result = await auditService.QueryAsync(query);

        // Assert - should have at least Created and Updated events
        Assert.True(result.TotalCount >= 2, $"Expected at least 2 audit events, got {result.TotalCount}");

        // Verify all events have required fields
        foreach (var evt in result.Items)
        {
            Assert.NotEqual(Guid.Empty, evt.Id);
            Assert.True(evt.Timestamp > DateTimeOffset.MinValue);
            Assert.Equal(AuditResourceType.Organization, evt.ResourceType);
            Assert.Equal(org.Id, evt.ResourceId);
            Assert.Equal(org.Id, evt.OrganizationId); // Organization context should be set
            Assert.True(Enum.IsDefined(typeof(AuditOutcome), evt.Outcome));
        }
    }

    [Fact]
    public async Task CreateOrganization_IncludesCreatorUserId()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = $"Creator Test Org {Guid.NewGuid()}",
            Description = "Test organization for creator tracking"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/organizations", request);
        var organization = await response.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        // Wait for audit event
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Organization,
            organization!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);

        // Get full details
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);

        // Assert - creatorUserId should be in details
        var detailsJson = details!.Details ?? string.Empty;
        Assert.Contains("creatorUserId", detailsJson);
        Assert.Contains(adminUserId.ToString(), detailsJson);
    }

    /// <summary>
    /// Helper method to create a test organization and return it with an admin token.
    /// </summary>
    private async Task<(Organization Organization, string AdminToken)> CreateTestOrganizationAsync()
    {
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
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

        return (organization!, adminToken);
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
