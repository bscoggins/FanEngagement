using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Common;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Proposals;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class PaginationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public PaginationTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    #region User Pagination Tests

    [Fact]
    public async Task GetUsers_WithPagination_ReturnsCorrectPage()
    {
        // Arrange - Create multiple users
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create 5 test users
        for (int i = 0; i < 5; i++)
        {
            var createRequest = new CreateUserRequest
            {
                Email = $"pagtest{i}-{Guid.NewGuid()}@example.com",
                DisplayName = $"PageTest User {i}",
                Password = "TestPassword123!"
            };
            await _client.PostAsJsonAsync("/users", createRequest);
        }

        // Act - Request first page with page size 3
        var response = await _client.GetAsync("/users?page=1&pageSize=3");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<UserDto>>();
        Assert.NotNull(result);
        Assert.Equal(3, result!.Items.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(3, result.PageSize);
        Assert.True(result.TotalCount >= 5); // At least the 5 we created
        Assert.True(result.TotalPages >= 2);
    }

    [Fact]
    public async Task GetUsers_WithSearch_FiltersCorrectly()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var uniquePrefix = $"searchtest-{Guid.NewGuid().ToString().Substring(0, 8)}";
        var createRequest1 = new CreateUserRequest
        {
            Email = $"{uniquePrefix}-alice@example.com",
            DisplayName = "Alice SearchTest",
            Password = "TestPassword123!"
        };
        await _client.PostAsJsonAsync("/users", createRequest1);

        var createRequest2 = new CreateUserRequest
        {
            Email = $"{uniquePrefix}-bob@example.com",
            DisplayName = "Bob SearchTest",
            Password = "TestPassword123!"
        };
        await _client.PostAsJsonAsync("/users", createRequest2);

        // Act - Search for Alice
        var response = await _client.GetAsync($"/users?search=alice&page=1&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<UserDto>>();
        Assert.NotNull(result);
        Assert.Contains(result!.Items, u => u.Email.Contains("alice", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task GetUsers_WithInvalidPage_ReturnsBadRequest()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act - Request page 0 (invalid)
        var response = await _client.GetAsync("/users?page=0&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetUsers_WithInvalidPageSize_ReturnsBadRequest()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act - Request page size greater than max (100)
        var response = await _client.GetAsync("/users?page=1&pageSize=200");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    #endregion

    #region Organization Pagination Tests

    [Fact]
    public async Task GetOrganizations_WithPagination_ReturnsCorrectPage()
    {
        // Arrange - Create multiple organizations
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create 5 test organizations
        for (int i = 0; i < 5; i++)
        {
            var orgRequest = new CreateOrganizationRequest
            {
                Name = $"PagTest Org {i}-{Guid.NewGuid()}",
                Description = $"Description {i}"
            };
            await _client.PostAsJsonAsync("/organizations", orgRequest);
        }

        _client.DefaultRequestHeaders.Remove("Authorization"); // Orgs endpoint is AllowAnonymous

        // Act - Request first page with page size 3
        var response = await _client.GetAsync("/organizations?page=1&pageSize=3");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<Organization>>();
        Assert.NotNull(result);
        Assert.Equal(3, result!.Items.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(3, result.PageSize);
        Assert.True(result.TotalCount >= 5);
    }

    [Fact]
    public async Task GetOrganizations_WithSearch_FiltersCorrectly()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var uniqueName = $"SearchableOrg-{Guid.NewGuid()}";
        var orgRequest = new CreateOrganizationRequest
        {
            Name = uniqueName,
            Description = "A unique organization"
        };
        await _client.PostAsJsonAsync("/organizations", orgRequest);

        _client.DefaultRequestHeaders.Remove("Authorization");

        // Act - Search for the unique organization
        var response = await _client.GetAsync($"/organizations?search={uniqueName}&page=1&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<Organization>>();
        Assert.NotNull(result);
        Assert.Contains(result!.Items, o => o.Name.Contains(uniqueName));
    }

    #endregion

    #region Proposal Pagination Tests

    [Fact]
    public async Task GetProposals_WithPagination_ReturnsCorrectPage()
    {
        // Arrange - Create organization and proposals
        var (userId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"ProposalPagOrg-{Guid.NewGuid()}",
            Description = "For proposal pagination tests"
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create 5 test proposals
        for (int i = 0; i < 5; i++)
        {
            var proposalRequest = new CreateProposalRequest
            {
                Title = $"Test Proposal {i}",
                Description = $"Description {i}",
                CreatedByUserId = userId
            };
            await _client.PostAsJsonAsync($"/organizations/{org!.Id}/proposals", proposalRequest);
        }

        // Act - Request first page with page size 3
        var response = await _client.GetAsync($"/organizations/{org!.Id}/proposals?page=1&pageSize=3");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<ProposalDto>>();
        Assert.NotNull(result);
        Assert.Equal(3, result!.Items.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(3, result.PageSize);
        Assert.Equal(5, result.TotalCount);
    }

    [Fact]
    public async Task GetProposals_WithStatusFilter_ReturnsOnlyMatchingProposals()
    {
        // Arrange - Create organization and proposals with different statuses
        var (userId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"StatusFilterOrg-{Guid.NewGuid()}",
            Description = "For status filter tests"
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        // Create proposals (they start as Open by default based on service implementation)
        for (int i = 0; i < 3; i++)
        {
            var proposalRequest = new CreateProposalRequest
            {
                Title = $"Status Test Proposal {i}",
                Description = $"Description {i}",
                CreatedByUserId = userId
            };
            await _client.PostAsJsonAsync($"/organizations/{org!.Id}/proposals", proposalRequest);
        }

        // Act - Filter by Open status
        var response = await _client.GetAsync($"/organizations/{org!.Id}/proposals?status=Open&page=1&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<ProposalDto>>();
        Assert.NotNull(result);
        Assert.True(result!.Items.Count >= 3);
        Assert.All(result.Items, p => Assert.Equal(ProposalStatus.Open, p.Status));
    }

    [Fact]
    public async Task GetProposals_WithSearch_FiltersCorrectly()
    {
        // Arrange
        var (userId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"SearchProposalOrg-{Guid.NewGuid()}",
            Description = "For proposal search tests"
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);

        var uniqueTitle = $"UniqueProposal-{Guid.NewGuid()}";
        var proposalRequest = new CreateProposalRequest
        {
            Title = uniqueTitle,
            Description = "Searchable proposal",
            CreatedByUserId = userId
        };
        await _client.PostAsJsonAsync($"/organizations/{org!.Id}/proposals", proposalRequest);

        // Act - Search for the unique proposal
        var response = await _client.GetAsync($"/organizations/{org!.Id}/proposals?search={uniqueTitle}&page=1&pageSize=10");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PagedResult<ProposalDto>>();
        Assert.NotNull(result);
        Assert.Contains(result!.Items, p => p.Title.Contains(uniqueTitle));
    }

    #endregion

    #region Backward Compatibility Tests

    [Fact]
    public async Task GetUsers_WithoutPagination_ReturnsAllUsers()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Act - Request without pagination parameters
        var response = await _client.GetAsync("/users");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var users = await response.Content.ReadFromJsonAsync<List<UserDto>>();
        Assert.NotNull(users);
        Assert.True(users!.Count > 0);
    }

    [Fact]
    public async Task GetOrganizations_WithoutPagination_ReturnsAllOrganizations()
    {
        // Arrange - Create at least one organization
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"BackCompatOrg-{Guid.NewGuid()}",
            Description = "Backward compat test"
        };
        await _client.PostAsJsonAsync("/organizations", orgRequest);

        _client.DefaultRequestHeaders.Remove("Authorization");

        // Act - Request without pagination parameters
        var response = await _client.GetAsync("/organizations");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var orgs = await response.Content.ReadFromJsonAsync<List<Organization>>();
        Assert.NotNull(orgs);
        Assert.True(orgs!.Count > 0);
    }

    #endregion
}
