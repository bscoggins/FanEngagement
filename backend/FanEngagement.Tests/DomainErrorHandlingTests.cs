using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Proposals;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Enums;
using Microsoft.AspNetCore.Mvc;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class DomainErrorHandlingTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public DomainErrorHandlingTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task UpdateProposal_ReturnsBadRequest_WhenProposalClosed()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        // Create proposal
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/proposals", new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7),
            QuorumRequirement = 50,
            CreatedByUserId = adminUserId
        });
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<FanEngagement.Application.Proposals.ProposalDto>();

        // Close the proposal
        await _client.PostAsync($"/proposals/{proposal!.Id}/close", null);

        // Act - Try to update closed proposal
        var updateResponse = await _client.PutAsJsonAsync($"/proposals/{proposal.Id}", new UpdateProposalRequest
        {
            Title = "Updated Title"
        });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
        var problemDetails = await updateResponse.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problemDetails);
        var responseBody = await updateResponse.Content.ReadAsStringAsync();
        _output.WriteLine($"Response body: {responseBody}");
        Assert.Contains("Cannot update proposal", problemDetails.Detail ?? "");
        _output.WriteLine($"Problem Details: {System.Text.Json.JsonSerializer.Serialize(problemDetails)}");
    }

    [Fact]
    public async Task CloseProposal_ReturnsBadRequest_WhenAlreadyClosed()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        // Create proposal
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/proposals", new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7),
            QuorumRequirement = 50,
            CreatedByUserId = adminUserId
        });
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<FanEngagement.Application.Proposals.ProposalDto>();

        // Close the proposal
        await _client.PostAsync($"/proposals/{proposal!.Id}/close", null);

        // Act - Try to close again
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problemDetails);
        Assert.Contains("already", problemDetails.Detail ?? "", StringComparison.OrdinalIgnoreCase);
        _output.WriteLine($"Problem Details: {System.Text.Json.JsonSerializer.Serialize(problemDetails)}");
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsBadRequest_WhenExceedsMaxSupply()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        // Create user
        var userResponse = await _client.PostAsJsonAsync("/users", new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = "TestPassword123!"
        });
        var user = await userResponse.Content.ReadFromJsonAsync<UserDto>();

        // Add user as member
        await _client.PostAsJsonAsync($"/organizations/{org!.Id}/memberships", new CreateMembershipRequest
        {
            UserId = user!.Id,
            Role = OrganizationRole.Member
        });

        // Create share type with max supply of 100
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-types", new CreateShareTypeRequest
        {
            Name = "Limited Share",
            Symbol = "LTD",
            VotingWeight = 1.0m,
            MaxSupply = 100m,
            IsTransferable = true
        });
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.ShareType>();

        // Issue 90 shares
        await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-issuances", new CreateShareIssuanceRequest
        {
            UserId = user.Id,
            ShareTypeId = shareType!.Id,
            Quantity = 90m,
            Reason = "Initial"
        });

        // Act - Try to issue 20 more (would exceed max supply of 100)
        var response = await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-issuances", new CreateShareIssuanceRequest
        {
            UserId = user.Id,
            ShareTypeId = shareType.Id,
            Quantity = 20m,
            Reason = "Exceeds max"
        });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problemDetails);
        Assert.Contains("MaxSupply", problemDetails.Detail ?? "");
        _output.WriteLine($"Problem Details: {System.Text.Json.JsonSerializer.Serialize(problemDetails)}");
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsBadRequest_WhenUserNotMember()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        // Create user (but don't add as member)
        var userResponse = await _client.PostAsJsonAsync("/users", new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = "TestPassword123!"
        });
        var user = await userResponse.Content.ReadFromJsonAsync<UserDto>();

        // Create share type
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/share-types", new CreateShareTypeRequest
        {
            Name = "Test Share",
            Symbol = "TEST",
            VotingWeight = 1.0m,
            IsTransferable = true
        });
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.ShareType>();

        // Act - Try to issue shares to non-member
        var response = await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-issuances", new CreateShareIssuanceRequest
        {
            UserId = user!.Id,
            ShareTypeId = shareType!.Id,
            Quantity = 10m,
            Reason = "Test"
        });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problemDetails);
        Assert.Contains("not a member", problemDetails.Detail ?? "");
        _output.WriteLine($"Problem Details: {System.Text.Json.JsonSerializer.Serialize(problemDetails)}");
    }

    [Fact]
    public async Task GetNonExistentResource_ReturnsNotFound()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/users/{nonExistentId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AddOptionToClosedProposal_ReturnsBadRequest()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        // Create proposal
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/proposals", new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7),
            QuorumRequirement = 50,
            CreatedByUserId = adminUserId
        });
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<FanEngagement.Application.Proposals.ProposalDto>();

        // Close the proposal
        await _client.PostAsync($"/proposals/{proposal!.Id}/close", null);

        // Act - Try to add option to closed proposal
        var response = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new FanEngagement.Application.Proposals.AddProposalOptionRequest
        {
            Text = "New Option",
            Description = "Test"
        });

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problemDetails);
        Assert.Contains("Cannot add options", problemDetails.Detail ?? "");
        _output.WriteLine($"Problem Details: {System.Text.Json.JsonSerializer.Serialize(problemDetails)}");
    }
}
