using System.Net.Http.Json;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.WebhookEndpoints;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Integration tests for webhook management audit events.
/// Verifies that all webhook CRUD operations and retry actions generate appropriate audit events.
/// </summary>
public class WebhookAuditTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public WebhookAuditTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateWebhookEndpoint_GeneratesAuditEvent_WithMaskedUrl()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateWebhookEndpointRequest(
            "https://example.com/webhook/very/long/path/that/should/be/masked",
            "secret123456789abc",
            new List<string> { "ProposalCreated", "ProposalFinalized" }
        );

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org.Id}/webhooks", request);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Webhook creation should succeed");
        var webhook = await response.Content.ReadFromJsonAsync<WebhookEndpointDto>();
        Assert.NotNull(webhook);

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.WebhookEndpoint,
            webhook!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Created, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.WebhookEndpoint, auditEvent.ResourceType);
        Assert.Equal(webhook.Id, auditEvent.ResourceId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(org.Id, auditEvent.OrganizationId);

        // Verify URL is masked in resource name (max 30 chars)
        Assert.NotNull(auditEvent.ResourceName);
        Assert.True(auditEvent.ResourceName!.Length <= 33, "Resource name should be masked to max 30 chars + '...'");
        Assert.Contains("...", auditEvent.ResourceName);

        // Verify details contain webhook information without secrets
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;
        
        // Should have masked URL
        Assert.Contains("endpointUrl", detailsJson);
        Assert.Contains("...", detailsJson);
        
        // Should have subscribed events
        Assert.Contains("subscribedEvents", detailsJson);
        Assert.Contains("ProposalCreated", detailsJson);
        Assert.Contains("ProposalFinalized", detailsJson);
        
        // Should NOT have the secret
        Assert.DoesNotContain("secret123456789abc", detailsJson);
        Assert.DoesNotContain("\"secret\"", detailsJson);
    }

    [Fact]
    public async Task UpdateWebhookEndpoint_GeneratesAuditEvent_WithChangedFields()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var webhook = await CreateWebhookAsync(org.Id, "https://example.com/webhook/original");

        var updateRequest = new UpdateWebhookEndpointRequest(
            "https://example.com/webhook/updated/path",
            "newsecret456789def",
            new List<string> { "ProposalCreated", "ProposalFinalized", "VoteCast" }
        );

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{org.Id}/webhooks/{webhook.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Webhook update should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.WebhookEndpoint,
            webhook.Id,
            AuditActionType.Updated);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Updated, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.WebhookEndpoint, auditEvent.ResourceType);
        Assert.Equal(webhook.Id, auditEvent.ResourceId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(org.Id, auditEvent.OrganizationId);

        // Verify details contain before/after values
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;

        // Should track changed fields
        Assert.Contains("changedFields", detailsJson);
        Assert.Contains("Url", detailsJson);
        Assert.Contains("SubscribedEvents", detailsJson);
        Assert.Contains("Secret", detailsJson);

        // Should have old and new URLs (masked)
        Assert.Contains("oldUrl", detailsJson);
        Assert.Contains("newUrl", detailsJson);

        // Should have old and new subscribed events
        Assert.Contains("oldSubscribedEvents", detailsJson);
        Assert.Contains("newSubscribedEvents", detailsJson);
        Assert.Contains("VoteCast", detailsJson);

        // Should NOT have secrets
        Assert.DoesNotContain("secret123456789abc", detailsJson);
        Assert.DoesNotContain("newsecret456789def", detailsJson);
    }

    [Fact]
    public async Task UpdateWebhookEndpoint_WithNoChanges_DoesNotGenerateAuditEvent()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var webhook = await CreateWebhookAsync(org.Id, "https://example.com/webhook");

        var updateRequest = new UpdateWebhookEndpointRequest(
            webhook.Url,
            "secret123456789abc", // Same secret as created
            webhook.SubscribedEvents
        );

        // Get count of audit events before update
        using var scope1 = _factory.Services.CreateScope();
        var auditService1 = scope1.ServiceProvider.GetRequiredService<IAuditService>();
        
        var queryBefore = new AuditQuery
        {
            ResourceType = AuditResourceType.WebhookEndpoint,
            ResourceId = webhook.Id,
            ActionType = AuditActionType.Updated,
            Page = 1,
            PageSize = 10
        };
        var resultBefore = await auditService1.QueryAsync(queryBefore);
        var countBefore = resultBefore.TotalCount;

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{org.Id}/webhooks/{webhook.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Webhook update should succeed");

        // Wait a bit and verify no update audit event was created
        await Task.Delay(200);

        using var scope2 = _factory.Services.CreateScope();
        var auditService2 = scope2.ServiceProvider.GetRequiredService<IAuditService>();

        var queryAfter = new AuditQuery
        {
            ResourceType = AuditResourceType.WebhookEndpoint,
            ResourceId = webhook.Id,
            ActionType = AuditActionType.Updated,
            Page = 1,
            PageSize = 10
        };
        var resultAfter = await auditService2.QueryAsync(queryAfter);

        // Should not have any new Update audit events
        Assert.Equal(countBefore, resultAfter.TotalCount);
    }

    [Fact]
    public async Task DeleteWebhookEndpoint_GeneratesAuditEvent_WithMaskedUrl()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var webhook = await CreateWebhookAsync(org.Id, "https://example.com/webhook/to/delete");

        // Act
        var response = await _client.DeleteAsync($"/organizations/{org.Id}/webhooks/{webhook.Id}");

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.NoContent, response.StatusCode);

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.WebhookEndpoint,
            webhook.Id,
            AuditActionType.Deleted);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Deleted, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.WebhookEndpoint, auditEvent.ResourceType);
        Assert.Equal(webhook.Id, auditEvent.ResourceId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(org.Id, auditEvent.OrganizationId);

        // Verify details contain webhook information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;

        // Should have masked URL
        Assert.Contains("endpointUrl", detailsJson);

        // Should indicate soft delete
        Assert.Contains("softDelete", detailsJson);
        Assert.Contains("true", detailsJson);

        // Should NOT have any secrets
        Assert.DoesNotContain("secret", detailsJson);
    }

    [Fact]
    public async Task RetryOutboundEvent_GeneratesAuditEvent_WithEventDetails()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        // Create a failed outbound event directly in the database
        Guid outboundEventId;
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagement.Infrastructure.Persistence.FanEngagementDbContext>();
            var outboundEvent = new FanEngagement.Domain.Entities.OutboundEvent
            {
                Id = Guid.NewGuid(),
                OrganizationId = org.Id,
                EventType = "ProposalCreated",
                Payload = "{\"proposalId\":\"test\"}",
                Status = OutboundEventStatus.Failed,
                AttemptCount = 3,
                LastError = "Connection timeout",
                CreatedAt = DateTimeOffset.UtcNow,
                LastAttemptAt = DateTimeOffset.UtcNow
            };
            dbContext.OutboundEvents.Add(outboundEvent);
            await dbContext.SaveChangesAsync();
            outboundEventId = outboundEvent.Id;
        }

        // Act
        var response = await _client.PostAsync($"/organizations/{org.Id}/outbound-events/{outboundEventId}/retry", null);

        // Assert
        Assert.Equal(System.Net.HttpStatusCode.NoContent, response.StatusCode);

        // Wait for audit event to be persisted
        using var scope2 = _factory.Services.CreateScope();
        var auditService = scope2.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.OutboundEvent,
            outboundEventId,
            AuditActionType.StatusChanged);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.StatusChanged, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.OutboundEvent, auditEvent.ResourceType);
        Assert.Equal(outboundEventId, auditEvent.ResourceId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(org.Id, auditEvent.OrganizationId);

        // Verify details contain retry information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        var detailsJson = details!.Details ?? string.Empty;

        // Should have event type
        Assert.Contains("eventType", detailsJson);
        Assert.Contains("ProposalCreated", detailsJson);

        // Should indicate manual retry
        Assert.Contains("manualRetry", detailsJson);
        Assert.Contains("true", detailsJson);

        // Should have status change information
        Assert.Contains("previousStatus", detailsJson);
        Assert.Contains("Failed", detailsJson);
        Assert.Contains("newStatus", detailsJson);
        Assert.Contains("Pending", detailsJson);

        // Should have attempt count
        Assert.Contains("attemptCount", detailsJson);
    }

    [Fact]
    public async Task WebhookAuditEvents_NeverLogSecrets()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var secretPhrase = "super-secret-webhook-key-12345";
        var request = new CreateWebhookEndpointRequest(
            "https://example.com/webhook",
            secretPhrase,
            new List<string> { "ProposalCreated" }
        );

        // Act - Create webhook
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{org.Id}/webhooks", request);
        var webhook = await createResponse.Content.ReadFromJsonAsync<WebhookEndpointDto>();
        Assert.NotNull(webhook);

        // Update webhook
        var updateRequest = new UpdateWebhookEndpointRequest(
            "https://example.com/webhook-updated",
            "another-secret-key-67890",
            new List<string> { "ProposalCreated", "VoteCast" }
        );
        await _client.PutAsJsonAsync($"/organizations/{org.Id}/webhooks/{webhook!.Id}", updateRequest);

        // Delete webhook
        await _client.DeleteAsync($"/organizations/{org.Id}/webhooks/{webhook.Id}");

        // Wait for all audit events to be persisted
        await Task.Delay(500);

        // Assert - Query all audit events for this webhook
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var query = new AuditQuery
        {
            ResourceType = AuditResourceType.WebhookEndpoint,
            ResourceId = webhook.Id,
            Page = 1,
            PageSize = 50
        };

        var result = await auditService.QueryAsync(query);

        // Verify no audit events contain any secrets - get all details and check
        var auditDetails = await Task.WhenAll(
            result.Items.Select(async evt => await auditService.GetByIdAsync(evt.Id))
        );

        foreach (var details in auditDetails)
        {
            Assert.NotNull(details);
            var detailsJson = details!.Details ?? string.Empty;

            // Should NEVER contain the actual secrets
            Assert.DoesNotContain(secretPhrase, detailsJson);
            Assert.DoesNotContain("super-secret-webhook-key", detailsJson);
            Assert.DoesNotContain("another-secret-key", detailsJson);
        }
    }

    [Fact]
    public async Task WebhookAuditEvents_IncludeActorInformation()
    {
        // Arrange
        var (org, adminToken) = await CreateTestOrganizationAsync();
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateWebhookEndpointRequest(
            "https://example.com/webhook",
            "secret123456789abc",
            new List<string> { "ProposalCreated" }
        );

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org.Id}/webhooks", request);
        var webhook = await response.Content.ReadFromJsonAsync<WebhookEndpointDto>();
        Assert.NotNull(webhook);

        // Wait for audit event
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.WebhookEndpoint,
            webhook!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);

        // Verify actor information is present
        Assert.NotNull(auditEvent.ActorUserId);
        Assert.NotEqual(Guid.Empty, auditEvent.ActorUserId);
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
            Description = "Test organization for webhook audit tests"
        };

        var response = await _client.PostAsJsonAsync("/organizations", request);
        var organization = await response.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        return (organization!, adminToken);
    }

    private async Task<WebhookEndpointDto> CreateWebhookAsync(Guid organizationId, string url)
    {
        var request = new CreateWebhookEndpointRequest(
            url,
            "secret123456789abc",
            new List<string> { "ProposalCreated", "ProposalFinalized" }
        );
        var response = await _client.PostAsJsonAsync($"/organizations/{organizationId}/webhooks", request);
        Assert.True(response.IsSuccessStatusCode);
        var webhook = await response.Content.ReadFromJsonAsync<WebhookEndpointDto>();
        Assert.NotNull(webhook);
        return webhook!;
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
