using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class ShareIssuanceTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public ShareIssuanceTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _client = factory.CreateClient();
        _output = output;
    }

    private async Task<(Guid organizationId, Guid userId, Guid shareTypeId)> SetupTestDataAsync()
    {
        // Get authentication token
        var (_, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        _client.AddAuthorizationHeader(token);

        // Create organization
        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"Test Organization {Guid.NewGuid()}",
            Description = "Test Organization"
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();

        // Create user
        var userRequest = new CreateUserRequest
        {
            Email = $"test-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User",
            Password = "TestPassword123!"
        };
        var userResponse = await _client.PostAsJsonAsync("/users", userRequest);
        var user = await userResponse.Content.ReadFromJsonAsync<User>();

        // Create membership
        var membershipRequest = new CreateMembershipRequest
        {
            UserId = user!.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{org!.Id}/memberships", membershipRequest);

        // Create share type
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Shares",
            Symbol = "TST",
            Description = "Test share type",
            VotingWeight = 1.0m,
            MaxSupply = null,
            IsTransferable = true
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-types", shareTypeRequest);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();

        return (org.Id, user.Id, shareType!.Id);
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsCreated_WithValidRequest()
    {
        // Arrange
        var (orgId, userId, shareTypeId) = await SetupTestDataAsync();
        var request = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareTypeId,
            Quantity = 100.0m,
            Reason = "Initial allocation"
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request);

        // Assert
        if (response.StatusCode != HttpStatusCode.Created)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var issuance = await response.Content.ReadFromJsonAsync<ShareIssuanceDto>();
        Assert.NotNull(issuance);
        Assert.NotEqual(Guid.Empty, issuance!.Id);
        Assert.Equal(userId, issuance.UserId);
        Assert.Equal(shareTypeId, issuance.ShareTypeId);
        Assert.Equal(100.0m, issuance.Quantity);
        Assert.True(issuance.IssuedAt <= DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsBadRequest_WhenQuantityIsZero()
    {
        // Arrange
        var (orgId, userId, shareTypeId) = await SetupTestDataAsync();
        var request = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareTypeId,
            Quantity = 0m
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsBadRequest_WhenQuantityIsNegative()
    {
        // Arrange
        var (orgId, userId, shareTypeId) = await SetupTestDataAsync();
        var request = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareTypeId,
            Quantity = -10m
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsBadRequest_WhenShareTypeDoesNotExist()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataAsync();
        var request = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = Guid.NewGuid(),
            Quantity = 100m
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsBadRequest_WhenUserDoesNotExist()
    {
        // Arrange
        var (orgId, _, shareTypeId) = await SetupTestDataAsync();
        var request = new CreateShareIssuanceRequest
        {
            UserId = Guid.NewGuid(),
            ShareTypeId = shareTypeId,
            Quantity = 100m
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsBadRequest_WhenUserNotMemberOfOrganization()
    {
        // Arrange
        var (orgId, _, shareTypeId) = await SetupTestDataAsync();

        // Create another user not in the organization
        var userRequest = new CreateUserRequest
        {
            Email = $"outsider-{Guid.NewGuid()}@example.com",
            DisplayName = "Outsider User",
            Password = "TestPassword123!"
        };
        var userResponse = await _client.PostAsJsonAsync("/users", userRequest);
        var outsiderUser = await userResponse.Content.ReadFromJsonAsync<User>();

        var request = new CreateShareIssuanceRequest
        {
            UserId = outsiderUser!.Id,
            ShareTypeId = shareTypeId,
            Quantity = 100m
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsBadRequest_WhenExceedsMaxSupply()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataAsync();

        // Create share type with max supply
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Limited Shares",
            Symbol = "LTD",
            VotingWeight = 1.0m,
            MaxSupply = 100m,
            IsTransferable = false
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareTypeRequest);
        var limitedShareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();

        var request = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = limitedShareType!.Id,
            Quantity = 150m
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.Contains("MaxSupply", error!.Error);
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsBadRequest_WhenCumulativeIssuancesExceedMaxSupply()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataAsync();

        // Create share type with max supply
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Limited Shares",
            Symbol = "LTD",
            VotingWeight = 1.0m,
            MaxSupply = 100m,
            IsTransferable = false
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareTypeRequest);
        var limitedShareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();

        // First issuance: 60 shares
        var request1 = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = limitedShareType!.Id,
            Quantity = 60m
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request1);

        // Second issuance: 50 shares (would exceed max supply of 100)
        var request2 = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = limitedShareType.Id,
            Quantity = 50m
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request2);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetShareIssuancesByOrganization_ReturnsListOfIssuances()
    {
        // Arrange
        var (orgId, userId, shareTypeId) = await SetupTestDataAsync();

        var request1 = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareTypeId,
            Quantity = 100m
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request1);

        var request2 = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareTypeId,
            Quantity = 50m
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request2);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/share-issuances");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var issuances = await response.Content.ReadFromJsonAsync<List<ShareIssuanceDto>>();
        Assert.NotNull(issuances);
        Assert.True(issuances!.Count >= 2);
    }

    [Fact]
    public async Task GetShareIssuancesByUser_ReturnsUserIssuances()
    {
        // Arrange
        var (orgId, userId, shareTypeId) = await SetupTestDataAsync();

        // Create another user in the same organization
        var user2Request = new CreateUserRequest
        {
            Email = $"test2-{Guid.NewGuid()}@example.com",
            DisplayName = "Test User 2",
            Password = "TestPassword123!"
        };
        var user2Response = await _client.PostAsJsonAsync("/users", user2Request);
        var user2 = await user2Response.Content.ReadFromJsonAsync<User>();

        var membership2Request = new CreateMembershipRequest
        {
            UserId = user2!.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/memberships", membership2Request);

        // Issue shares to both users
        var request1 = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareTypeId,
            Quantity = 100m
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request1);

        var request2 = new CreateShareIssuanceRequest
        {
            UserId = user2.Id,
            ShareTypeId = shareTypeId,
            Quantity = 50m
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request2);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/users/{userId}/share-issuances");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var issuances = await response.Content.ReadFromJsonAsync<List<ShareIssuanceDto>>();
        Assert.NotNull(issuances);
        Assert.All(issuances!, i => Assert.Equal(userId, i.UserId));
    }

    [Fact]
    public async Task GetBalancesByUser_ReturnsUserBalances()
    {
        // Arrange
        var (orgId, userId, shareTypeId) = await SetupTestDataAsync();

        // Create another share type
        var shareType2Request = new CreateShareTypeRequest
        {
            Name = "Premium Shares",
            Symbol = "PRM",
            VotingWeight = 2.0m,
            MaxSupply = null,
            IsTransferable = true
        };
        var shareType2Response = await _client.PostAsJsonAsync($"/organizations/{orgId}/share-types", shareType2Request);
        var shareType2 = await shareType2Response.Content.ReadFromJsonAsync<ShareType>();

        // Issue shares of both types
        var request1 = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareTypeId,
            Quantity = 100m
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request1);

        var request2 = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareType2!.Id,
            Quantity = 50m
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request2);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/users/{userId}/balances");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var balances = await response.Content.ReadFromJsonAsync<List<ShareBalanceDto>>();
        Assert.NotNull(balances);
        Assert.Equal(2, balances!.Count);

        var testShareBalance = balances.FirstOrDefault(b => b.ShareTypeSymbol == "TST");
        Assert.NotNull(testShareBalance);
        Assert.Equal(100m, testShareBalance!.Balance);

        var premiumShareBalance = balances.FirstOrDefault(b => b.ShareTypeSymbol == "PRM");
        Assert.NotNull(premiumShareBalance);
        Assert.Equal(50m, premiumShareBalance!.Balance);
    }

    [Fact]
    public async Task CreateShareIssuance_UpdatesExistingBalance()
    {
        // Arrange
        var (orgId, userId, shareTypeId) = await SetupTestDataAsync();

        // First issuance
        var request1 = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareTypeId,
            Quantity = 100m
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request1);

        // Second issuance
        var request2 = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareTypeId,
            Quantity = 50m
        };
        await _client.PostAsJsonAsync($"/organizations/{orgId}/share-issuances", request2);

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/users/{userId}/balances");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var balances = await response.Content.ReadFromJsonAsync<List<ShareBalanceDto>>();
        Assert.NotNull(balances);
        Assert.Single(balances!);
        Assert.Equal(150m, balances[0].Balance); // 100 + 50
    }

    [Fact]
    public async Task GetBalancesByUser_ReturnsEmptyList_WhenNoIssuances()
    {
        // Arrange
        var (orgId, userId, _) = await SetupTestDataAsync();

        // Act
        var response = await _client.GetAsync($"/organizations/{orgId}/users/{userId}/balances");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var balances = await response.Content.ReadFromJsonAsync<List<ShareBalanceDto>>();
        Assert.NotNull(balances);
        Assert.Empty(balances!);
    }

    [Fact]
    public async Task GetShareIssuancesByOrganization_ReturnsOnlyForSpecifiedOrganization()
    {
        // Arrange - Create two organizations with issuances
        var (org1Id, user1Id, shareType1Id) = await SetupTestDataAsync();
        var (org2Id, user2Id, shareType2Id) = await SetupTestDataAsync();

        var request1 = new CreateShareIssuanceRequest
        {
            UserId = user1Id,
            ShareTypeId = shareType1Id,
            Quantity = 100m
        };
        await _client.PostAsJsonAsync($"/organizations/{org1Id}/share-issuances", request1);

        var request2 = new CreateShareIssuanceRequest
        {
            UserId = user2Id,
            ShareTypeId = shareType2Id,
            Quantity = 50m
        };
        await _client.PostAsJsonAsync($"/organizations/{org2Id}/share-issuances", request2);

        // Act
        var response = await _client.GetAsync($"/organizations/{org1Id}/share-issuances");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var issuances = await response.Content.ReadFromJsonAsync<List<ShareIssuanceDto>>();
        Assert.NotNull(issuances);
        Assert.All(issuances!, i => Assert.Equal(shareType1Id, i.ShareTypeId));
    }

    private sealed record ErrorResponse(string Error);
}
