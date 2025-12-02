using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Common;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Integration tests for audit query API endpoints.
/// </summary>
public class AuditQueryApiTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public AuditQueryApiTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _output = output;
    }

    [Fact]
    public async Task OrganizationAuditEvents_OrgAdmin_CanQueryOwnOrgEvents()
    {
        // Arrange: Create admin user, organization, and some audit events
        var (adminId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        // Create an organization
        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create some audit events for this organization
        using (var scope = _factory.Services.CreateScope())
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
            
            for (int i = 0; i < 5; i++)
            {
                await auditService.LogSyncAsync(new AuditEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = DateTimeOffset.UtcNow.AddMinutes(-i),
                    ActionType = i % 2 == 0 ? AuditActionType.Created : AuditActionType.Updated,
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

        // Act: Query audit events for this organization
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events?page=1&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<AuditEventDto>>();
        Assert.NotNull(result);
        Assert.Equal(5, result.TotalCount);
        Assert.Equal(5, result.Items.Count);
        Assert.All(result.Items, item => Assert.Equal(org.Id, item.OrganizationId));
    }

    [Fact]
    public async Task OrganizationAuditEvents_FilterByActionType_ReturnsOnlyMatching()
    {
        // Arrange
        var (adminId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Use a unique test user ID for this test to isolate our events
        var testUserId = Guid.NewGuid();

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
                ActorUserId = testUserId,
                Outcome = AuditOutcome.Success
            });

            await auditService.LogSyncAsync(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow,
                ActionType = AuditActionType.Updated,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                OrganizationId = org.Id,
                ActorUserId = testUserId,
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
                ActorUserId = testUserId,
                Outcome = AuditOutcome.Success
            });
        }

        // Act: Query with actionType filter for Created and Updated, and actorUserId to isolate our test events
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events?actionType=Created,Updated&actorUserId={testUserId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<AuditEventDto>>();
        Assert.NotNull(result);
        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, item => 
            Assert.True(item.ActionType == AuditActionType.Created || item.ActionType == AuditActionType.Updated));
    }

    [Fact]
    public async Task OrganizationAuditEvents_Pagination_WorksCorrectly()
    {
        // Arrange
        var (adminId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create 15 audit events
        using (var scope = _factory.Services.CreateScope())
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
            
            for (int i = 0; i < 15; i++)
            {
                await auditService.LogSyncAsync(new AuditEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = DateTimeOffset.UtcNow.AddMinutes(-i),
                    ActionType = AuditActionType.Created,
                    ResourceType = AuditResourceType.Proposal,
                    ResourceId = Guid.NewGuid(),
                    OrganizationId = org.Id,
                    ActorUserId = adminId,
                    Outcome = AuditOutcome.Success
                });
            }
        }

        // Act: Query first page with page size 10
        var response1 = await client.GetAsync($"/organizations/{org.Id}/audit-events?page=1&pageSize=10");
        var result1 = await response1.Content.ReadFromJsonAsync<PagedResult<AuditEventDto>>();

        // Query second page
        var response2 = await client.GetAsync($"/organizations/{org.Id}/audit-events?page=2&pageSize=10");
        var result2 = await response2.Content.ReadFromJsonAsync<PagedResult<AuditEventDto>>();

        // Assert
        Assert.NotNull(result1);
        Assert.NotNull(result2);
        Assert.Equal(15, result1.TotalCount);
        Assert.Equal(10, result1.Items.Count);
        Assert.Equal(15, result2.TotalCount);
        Assert.Equal(5, result2.Items.Count);
        Assert.True(result1.HasNextPage);
        Assert.False(result2.HasNextPage);
    }

    [Fact]
    public async Task AdminAuditEvents_GlobalAdmin_CanQueryAcrossOrganizations()
    {
        // Arrange
        var (adminId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        // Create two organizations
        var org1 = await CreateOrganization(client);
        var org2 = await CreateOrganization(client);

        // Create audit events in both organizations
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
                ActorUserId = adminId,
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
                ActorUserId = adminId,
                Outcome = AuditOutcome.Success
            });
        }

        // Act: Query all events across organizations
        var responseAll = await client.GetAsync("/admin/audit-events");
        var resultAll = await responseAll.Content.ReadFromJsonAsync<PagedResult<AuditEventDto>>();

        // Query events for specific organization
        var responseOrg1 = await client.GetAsync($"/admin/audit-events?organizationId={org1.Id}");
        var resultOrg1 = await responseOrg1.Content.ReadFromJsonAsync<PagedResult<AuditEventDto>>();

        // Assert
        Assert.NotNull(resultAll);
        Assert.True(resultAll.TotalCount >= 2);
        
        Assert.NotNull(resultOrg1);
        Assert.True(resultOrg1.TotalCount >= 1);
        Assert.All(resultOrg1.Items, item => Assert.Equal(org1.Id, item.OrganizationId));
    }

    [Fact]
    public async Task AdminAuditEvents_NonAdmin_Returns403()
    {
        // Arrange: Create regular user (non-admin)
        var client = _factory.CreateClient();
        var (user, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(client);
        client.AddAuthorizationHeader(token);

        // Act: Try to access admin audit events endpoint
        var response = await client.GetAsync("/admin/audit-events");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UserAuditEvents_ReturnsOnlyCurrentUserEvents()
    {
        // Arrange: Create two users
        var client = _factory.CreateClient();
        var (user1, token1) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(client);
        var (user2, token2) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(client);

        // Create audit events for both users
        using (var scope = _factory.Services.CreateScope())
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
            
            await auditService.LogSyncAsync(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow,
                ActionType = AuditActionType.Authenticated,
                ResourceType = AuditResourceType.User,
                ResourceId = user1.Id,
                ActorUserId = user1.Id,
                ActorDisplayName = user1.DisplayName,
                Outcome = AuditOutcome.Success
            });

            await auditService.LogSyncAsync(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = DateTimeOffset.UtcNow,
                ActionType = AuditActionType.Authenticated,
                ResourceType = AuditResourceType.User,
                ResourceId = user2.Id,
                ActorUserId = user2.Id,
                ActorDisplayName = user2.DisplayName,
                Outcome = AuditOutcome.Success
            });
        }

        // Act: Query as user1
        client.AddAuthorizationHeader(token1);
        var response = await client.GetAsync("/users/me/audit-events");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<AuditEventUserDto>>();
        Assert.NotNull(result);
        Assert.True(result.TotalCount >= 1);
        // Verify no IP addresses are returned (privacy filter)
        Assert.IsType<AuditEventUserDto>(result.Items[0]);
    }

    [Fact]
    public async Task UserAuditEvents_Unauthenticated_Returns401()
    {
        // Arrange: Create client without authentication
        var client = _factory.CreateClient();

        // Act: Try to access user audit events endpoint
        var response = await client.GetAsync("/users/me/audit-events");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task OrganizationAuditEvents_FilterByDateRange_ReturnsOnlyMatchingDates()
    {
        // Arrange
        var (adminId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        var now = DateTimeOffset.UtcNow;

        // Create audit events with different timestamps
        using (var scope = _factory.Services.CreateScope())
        {
            var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
            
            // Old event (5 days ago)
            await auditService.LogSyncAsync(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = now.AddDays(-5),
                ActionType = AuditActionType.Created,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                OrganizationId = org.Id,
                ActorUserId = adminId,
                Outcome = AuditOutcome.Success
            });

            // Recent event (1 day ago)
            await auditService.LogSyncAsync(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = now.AddDays(-1),
                ActionType = AuditActionType.Updated,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                OrganizationId = org.Id,
                ActorUserId = adminId,
                Outcome = AuditOutcome.Success
            });
        }

        // Act: Query with date range for last 2 days
        var dateFrom = Uri.EscapeDataString(now.AddDays(-2).ToString("o"));
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events?dateFrom={dateFrom}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<AuditEventDto>>();
        Assert.NotNull(result);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(AuditActionType.Updated, result.Items[0].ActionType);
    }

    [Fact]
    public async Task OrganizationAuditEvents_FilterByResourceType_ReturnsOnlyMatching()
    {
        // Arrange
        var (adminId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create audit events with different resource types
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
                ActionType = AuditActionType.Created,
                ResourceType = AuditResourceType.ShareType,
                ResourceId = Guid.NewGuid(),
                OrganizationId = org.Id,
                ActorUserId = adminId,
                Outcome = AuditOutcome.Success
            });
        }

        // Act: Query with resourceType filter for Proposal and ShareType
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events?resourceType=Proposal,ShareType");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<AuditEventDto>>();
        Assert.NotNull(result);
        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, item => 
            Assert.True(item.ResourceType == AuditResourceType.Proposal || item.ResourceType == AuditResourceType.ShareType));
    }

    [Fact]
    public async Task OrganizationAuditEvents_FilterByOutcome_ReturnsOnlyMatching()
    {
        // Arrange
        var (adminId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        var client = _factory.CreateClient();
        client.AddAuthorizationHeader(adminToken);

        var createOrgRequest = new CreateOrganizationRequest { Name = $"Test Org {Guid.NewGuid()}" };
        var createOrgResponse = await client.PostAsJsonAsync("/organizations", createOrgRequest);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create audit events with different outcomes
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
                ActionType = AuditActionType.Created,
                ResourceType = AuditResourceType.Proposal,
                ResourceId = Guid.NewGuid(),
                OrganizationId = org.Id,
                ActorUserId = adminId,
                Outcome = AuditOutcome.Failure,
                FailureReason = "Test failure"
            });
        }

        // Act: Query with outcome filter for Failure
        var response = await client.GetAsync($"/organizations/{org.Id}/audit-events?outcome=Failure");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<AuditEventDto>>();
        Assert.NotNull(result);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(AuditOutcome.Failure, result.Items[0].Outcome);
        Assert.Equal("Test failure", result.Items[0].FailureReason);
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
