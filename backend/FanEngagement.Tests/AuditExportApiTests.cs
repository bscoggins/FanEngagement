using System.Net;
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
/// Integration tests for audit event export endpoints.
/// </summary>
public class AuditExportApiTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public AuditExportApiTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _output = output;
    }

    [Fact]
    public async Task OrganizationAuditExport_CSV_StreamsCorrectFormat()
    {
        // Arrange: Create admin user and organization
        var (adminId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create some audit events
        using (var scope = _factory.Services.CreateScope())
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
            
            for (int i = 0; i < 3; i++)
            {
                await auditService.LogSyncAsync(new AuditEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = DateTimeOffset.UtcNow.AddMinutes(-i),
                    ActionType = AuditActionType.Created,
                    ResourceType = AuditResourceType.Proposal,
                    ResourceId = Guid.NewGuid(),
                    ResourceName = $"Test Resource {i}",
                    OrganizationId = org.Id,
                    OrganizationName = org.Name,
                    ActorUserId = adminId,
                    ActorDisplayName = "Admin User",
                    Outcome = AuditOutcome.Success
                });
            }
        }

        // Act: Request CSV export
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events/export?format=csv");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.NotNull(response.Content.Headers.ContentDisposition);
        Assert.Contains("attachment", response.Content.Headers.ContentDisposition.ToString());
        Assert.Contains(".csv", response.Content.Headers.ContentDisposition.ToString());

        var csvContent = await response.Content.ReadAsStringAsync();
        _output.WriteLine("CSV Export:");
        _output.WriteLine(csvContent);

        // Verify CSV structure
        var lines = csvContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.True(lines.Length >= 4); // Header + 3 data rows
        Assert.Contains("Id,Timestamp,ActorUserId", lines[0]); // Check header
        Assert.Contains("Test Resource", csvContent); // Check data
    }

    [Fact]
    public async Task OrganizationAuditExport_JSON_StreamsCorrectFormat()
    {
        // Arrange: Create admin user and organization
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create some audit events with a specific test user ID to isolate them
        var testUserId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
            
            for (int i = 0; i < 2; i++)
            {
                await auditService.LogSyncAsync(new AuditEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = DateTimeOffset.UtcNow.AddMinutes(-i),
                    ActionType = AuditActionType.Updated,
                    ResourceType = AuditResourceType.ShareType,
                    ResourceId = Guid.NewGuid(),
                    ResourceName = $"Share Type {i}",
                    OrganizationId = org.Id,
                    OrganizationName = org.Name,
                    ActorUserId = testUserId,
                    ActorDisplayName = "Test User",
                    Outcome = AuditOutcome.Success
                });
            }
        }

        // Act: Request JSON export with actor filter to get only our test events
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events/export?format=json&actorUserId={testUserId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.NotNull(response.Content.Headers.ContentDisposition);
        Assert.Contains("attachment", response.Content.Headers.ContentDisposition.ToString());
        Assert.Contains(".json", response.Content.Headers.ContentDisposition.ToString());

        var jsonContent = await response.Content.ReadAsStringAsync();
        _output.WriteLine("JSON Export:");
        _output.WriteLine(jsonContent);

        // Verify JSON structure
        Assert.StartsWith("[", jsonContent);
        Assert.EndsWith("]", jsonContent.TrimEnd());
        
        // Parse JSON to verify it's valid
        var events = System.Text.Json.JsonSerializer.Deserialize<List<AuditEventDto>>(jsonContent, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        });
        Assert.NotNull(events);
        Assert.Equal(2, events.Count);
        Assert.All(events, e => Assert.Equal(AuditActionType.Updated, e.ActionType));
    }

    [Fact]
    public async Task OrganizationAuditExport_WithFilters_AppliesCorrectly()
    {
        // Arrange
        var (adminId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create audit events with different action types
        using (var scope = _factory.Services.CreateScope())
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
            
            await auditService.LogSyncAsync(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow,
                ActionType = AuditActionType.Created,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                OrganizationId = org.Id,
                ActorUserId = adminId,
                Outcome = AuditOutcome.Success
            });

            await auditService.LogSyncAsync(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow,
                ActionType = AuditActionType.Deleted,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                OrganizationId = org.Id,
                ActorUserId = adminId,
                Outcome = AuditOutcome.Success
            });
        }

        // Act: Export with action type filter
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events/export?format=json&actionType=Created");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var jsonContent = await response.Content.ReadAsStringAsync();
        var events = System.Text.Json.JsonSerializer.Deserialize<List<AuditEventDto>>(jsonContent);
        Assert.NotNull(events);
        var singleEvent = Assert.Single(events);
        Assert.Equal(AuditActionType.Created, singleEvent.ActionType);
    }

    [Fact]
    public async Task AdminAuditExport_GlobalAdmin_CanExportAcrossOrganizations()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        // Create two organizations
        var org1 = await CreateOrganization(client);
        var org2 = await CreateOrganization(client);

        // Create audit events in both organizations with test user IDs
        var testUserId1 = Guid.NewGuid();
        var testUserId2 = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
            
            await auditService.LogSyncAsync(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow,
                ActionType = AuditActionType.Created,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                OrganizationId = org1.Id,
                OrganizationName = org1.Name,
                ActorUserId = testUserId1,
                Outcome = AuditOutcome.Success
            });

            await auditService.LogSyncAsync(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow,
                ActionType = AuditActionType.Created,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                OrganizationId = org2.Id,
                OrganizationName = org2.Name,
                ActorUserId = testUserId2,
                Outcome = AuditOutcome.Success
            });
        }

        // Act: Export all events for test users
        var responseAll = await client.GetAsync($"/admin/audit-events/export?format=json&actorUserId={testUserId1}");
        var jsonContentAll = await responseAll.Content.ReadAsStringAsync();
        _output.WriteLine($"Response All Content: {jsonContentAll}");
        var options = new System.Text.Json.JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        };
        var eventsAll = string.IsNullOrWhiteSpace(jsonContentAll) || jsonContentAll == "[]" 
            ? new List<AuditEventDto>() 
            : System.Text.Json.JsonSerializer.Deserialize<List<AuditEventDto>>(jsonContentAll, options);

        // Export events for specific organization
        var responseOrg1 = await client.GetAsync($"/admin/audit-events/export?format=json&organizationId={org1.Id}&actorUserId={testUserId1}");
        var jsonContentOrg1 = await responseOrg1.Content.ReadAsStringAsync();
        _output.WriteLine($"Response Org1 Content: {jsonContentOrg1}");
        var eventsOrg1 = string.IsNullOrWhiteSpace(jsonContentOrg1) || jsonContentOrg1 == "[]" 
            ? new List<AuditEventDto>() 
            : System.Text.Json.JsonSerializer.Deserialize<List<AuditEventDto>>(jsonContentOrg1, options);

        // Assert
        Assert.NotNull(eventsAll);
        Assert.True(eventsAll.Count >= 1);
        
        Assert.NotNull(eventsOrg1);
        Assert.True(eventsOrg1.Count >= 1);
        Assert.All(eventsOrg1, item => Assert.Equal(org1.Id, item.OrganizationId));
    }

    [Fact]
    public async Task OrganizationAuditExport_InvalidFormat_ReturnsBadRequest()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Act: Request export with invalid format
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events/export?format=xml");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task OrganizationAuditExport_EmptyResult_ReturnsEmptyFormat()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Act: Request export with filter that matches nothing
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events/export?format=json&actionType=Deleted&dateFrom=2099-01-01");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var jsonContent = await response.Content.ReadAsStringAsync();
        _output.WriteLine("Empty JSON Export:");
        _output.WriteLine(jsonContent);
        Assert.Equal("[]", jsonContent);
    }

    [Fact]
    public async Task OrganizationAuditExport_LogsExportAction()
    {
        // Arrange
        var (adminId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Act: Perform export
        await client.GetAsync($"/organizations/{org.Id}/audit-events/export?format=csv");

        // Assert: Verify export action was audited
        var auditResponse = await client.GetAsync($"/organizations/{org.Id}/audit-events?actionType=Exported&resourceType=AuditEvent");
        Assert.Equal(HttpStatusCode.OK, auditResponse.StatusCode);
        var auditResult = await auditResponse.Content.ReadFromJsonAsync<Application.Common.PagedResult<AuditEventDto>>();
        Assert.NotNull(auditResult);
        
        _output.WriteLine($"Found {auditResult.TotalCount} Exported audit events");
        
        // There should be at least one export audit event
        Assert.True(auditResult.TotalCount >= 1, $"Expected at least 1 export audit event, but found {auditResult.TotalCount}");
        
        var exportAudit = auditResult.Items.FirstOrDefault(e => 
            e.ActionType == AuditActionType.Exported && 
            e.ResourceType == AuditResourceType.AuditEvent);
        Assert.NotNull(exportAudit);
        Assert.Equal(adminId, exportAudit.ActorUserId);
    }

    [Fact]
    public async Task AdminAuditExport_NonAdmin_Returns403()
    {
        // Arrange: Create regular user (non-admin)
        var client = _factory.CreateClient();
        var (_, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(client);
        client.AddAuthorizationHeader(token);

        // Act: Try to access admin audit export endpoint
        var response = await client.GetAsync("/admin/audit-events/export?format=csv");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task OrganizationAuditExport_LargeDataset_StreamsEfficiently()
    {
        // Arrange: Create admin user and organization
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create 250 audit events (more than 2 batches of 100) with specific test user
        var testUserId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
            
            for (int i = 0; i < 250; i++)
            {
                await auditService.LogSyncAsync(new AuditEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = DateTimeOffset.UtcNow.AddMinutes(-i),
                    ActionType = AuditActionType.Created,
                    ResourceType = AuditResourceType.Proposal,
                    ResourceId = Guid.NewGuid(),
                    ResourceName = $"Test Resource {i}",
                    OrganizationId = org.Id,
                    OrganizationName = org.Name,
                    ActorUserId = testUserId,
                    ActorDisplayName = "Test User",
                    Outcome = AuditOutcome.Success
                });
            }
        }

        // Act: Request JSON export with actor filter
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events/export?format=json&actorUserId={testUserId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var jsonContent = await response.Content.ReadAsStringAsync();
        
        // Parse JSON to verify all events are present
        var events = System.Text.Json.JsonSerializer.Deserialize<List<AuditEventDto>>(jsonContent, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        });
        Assert.NotNull(events);
        Assert.Equal(250, events.Count);
        _output.WriteLine($"Successfully exported {events.Count} events");
    }

    [Fact]
    public async Task OrganizationAuditExport_JSON_ExactMultipleOfBatchSize()
    {
        // Arrange: Create admin user and organization
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create exactly 200 audit events (2 * batch size of 100) with specific test user
        var testUserId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
            
            for (int i = 0; i < 200; i++)
            {
                await auditService.LogSyncAsync(new AuditEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = DateTimeOffset.UtcNow.AddMinutes(-i),
                    ActionType = AuditActionType.Created,
                    ResourceType = AuditResourceType.Proposal,
                    ResourceId = Guid.NewGuid(),
                    ResourceName = $"Test Resource {i}",
                    OrganizationId = org.Id,
                    OrganizationName = org.Name,
                    ActorUserId = testUserId,
                    ActorDisplayName = "Test User",
                    Outcome = AuditOutcome.Success
                });
            }
        }

        // Act: Request JSON export with actor filter
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events/export?format=json&actorUserId={testUserId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var jsonContent = await response.Content.ReadAsStringAsync();
        
        _output.WriteLine("JSON Export (200 events):");
        _output.WriteLine($"First 500 chars: {jsonContent.Substring(0, Math.Min(500, jsonContent.Length))}");
        _output.WriteLine($"Last 100 chars: {jsonContent.Substring(Math.Max(0, jsonContent.Length - 100))}");
        
        // Verify JSON structure - must start with [ and end with ]
        Assert.StartsWith("[", jsonContent);
        Assert.EndsWith("]", jsonContent.TrimEnd());
        
        // Parse JSON to verify it's valid and complete
        var events = System.Text.Json.JsonSerializer.Deserialize<List<AuditEventDto>>(jsonContent, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        });
        Assert.NotNull(events);
        Assert.Equal(200, events.Count);
        _output.WriteLine($"Successfully exported and parsed {events.Count} events");
    }

    private async Task<Organization> CreateOrganization(HttpClient client)
    {
        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);
        return org;
    }
}
