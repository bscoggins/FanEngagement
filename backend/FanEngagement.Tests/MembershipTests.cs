using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Enums;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class MembershipTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public MembershipTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateMembership_ReturnsCreated_WithValidRequest()
    {
        // Arrange
        var (organizationId, userId) = await SetupOrganizationAndUser();

        var request = new CreateMembershipRequest
        {
            UserId = userId,
            Role = OrganizationRole.Member
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{organizationId}/memberships", request);

        // Assert
        if (response.StatusCode != HttpStatusCode.Created)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var membership = await response.Content.ReadFromJsonAsync<MembershipDto>();
        Assert.NotNull(membership);
        Assert.NotEqual(Guid.Empty, membership!.Id);
        Assert.Equal(organizationId, membership.OrganizationId);
        Assert.Equal(userId, membership.UserId);
        Assert.Equal(OrganizationRole.Member, membership.Role);
        Assert.True(membership.CreatedAt <= DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task GetAllMemberships_ReturnsListOfMemberships()
    {
        // Arrange
        var (organizationId, userId1) = await SetupOrganizationAndUser();
        var userId2 = await CreateUser();

        await _client.PostAsJsonAsync($"/organizations/{organizationId}/memberships", new CreateMembershipRequest
        {
            UserId = userId1,
            Role = OrganizationRole.OrgAdmin
        });
        await _client.PostAsJsonAsync($"/organizations/{organizationId}/memberships", new CreateMembershipRequest
        {
            UserId = userId2,
            Role = OrganizationRole.Member
        });

        // Act
        var response = await _client.GetAsync($"/organizations/{organizationId}/memberships");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var memberships = await response.Content.ReadFromJsonAsync<List<MembershipDto>>();
        Assert.NotNull(memberships);
        Assert.True(memberships!.Count >= 2);
        Assert.All(memberships, m => Assert.Equal(organizationId, m.OrganizationId));
    }

    [Fact]
    public async Task GetMembershipByUser_ReturnsMembership_WhenExists()
    {
        // Arrange
        var (organizationId, userId) = await SetupOrganizationAndUser();
        var createRequest = new CreateMembershipRequest
        {
            UserId = userId,
            Role = OrganizationRole.OrgAdmin
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{organizationId}/memberships", createRequest);
        var createdMembership = await createResponse.Content.ReadFromJsonAsync<MembershipDto>();

        // Act
        var response = await _client.GetAsync($"/organizations/{organizationId}/memberships/{userId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var membership = await response.Content.ReadFromJsonAsync<MembershipDto>();
        Assert.NotNull(membership);
        Assert.Equal(createdMembership!.Id, membership!.Id);
        Assert.Equal(userId, membership.UserId);
        Assert.Equal(organizationId, membership.OrganizationId);
    }

    [Fact]
    public async Task GetMembershipByUser_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange
        var (organizationId, _) = await SetupOrganizationAndUser();
        var nonExistentUserId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/organizations/{organizationId}/memberships/{nonExistentUserId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteMembership_ReturnsNoContent_WhenExists()
    {
        // Arrange
        var (organizationId, userId) = await SetupOrganizationAndUser();
        await _client.PostAsJsonAsync($"/organizations/{organizationId}/memberships", new CreateMembershipRequest
        {
            UserId = userId,
            Role = OrganizationRole.Member
        });

        // Act
        var deleteResponse = await _client.DeleteAsync($"/organizations/{organizationId}/memberships/{userId}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Verify membership is deleted
        var getResponse = await _client.GetAsync($"/organizations/{organizationId}/memberships/{userId}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteMembership_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange
        var (organizationId, _) = await SetupOrganizationAndUser();
        var nonExistentUserId = Guid.NewGuid();

        // Act
        var response = await _client.DeleteAsync($"/organizations/{organizationId}/memberships/{nonExistentUserId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetMemberships_ReturnsOnlyForSpecifiedOrganization()
    {
        // Arrange
        var (organization1Id, user1Id) = await SetupOrganizationAndUser();
        var organization2Id = await CreateOrganization();
        var user2Id = await CreateUser();

        await _client.PostAsJsonAsync($"/organizations/{organization1Id}/memberships", new CreateMembershipRequest
        {
            UserId = user1Id,
            Role = OrganizationRole.Member
        });
        await _client.PostAsJsonAsync($"/organizations/{organization2Id}/memberships", new CreateMembershipRequest
        {
            UserId = user2Id,
            Role = OrganizationRole.Member
        });

        // Act
        var response1 = await _client.GetAsync($"/organizations/{organization1Id}/memberships");
        var response2 = await _client.GetAsync($"/organizations/{organization2Id}/memberships");

        // Assert
        var memberships1 = await response1.Content.ReadFromJsonAsync<List<MembershipDto>>();
        var memberships2 = await response2.Content.ReadFromJsonAsync<List<MembershipDto>>();
        
        Assert.NotNull(memberships1);
        Assert.NotNull(memberships2);
        Assert.All(memberships1!, m => Assert.Equal(organization1Id, m.OrganizationId));
        Assert.All(memberships2!, m => Assert.Equal(organization2Id, m.OrganizationId));
    }

    private async Task<(Guid organizationId, Guid userId)> SetupOrganizationAndUser()
    {
        var organizationId = await CreateOrganization();
        var userId = await CreateUser();
        return (organizationId, userId);
    }

    private async Task<Guid> CreateOrganization()
    {
        var response = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test Organization"
        });
        var org = await response.Content.ReadFromJsonAsync<OrganizationDto>();
        return org!.Id;
    }

    private class OrganizationDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    private async Task<Guid> CreateUser()
    {
        var response = await _client.PostAsJsonAsync("/users", new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User"
        });
        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        return user!.Id;
    }
}
