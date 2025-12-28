using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Proposals;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

[Trait("Category", "PolygonIntegration")]
public class PolygonIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;
    private readonly string _adapterUrl;
    private readonly string _apiKey;

    public PolygonIntegrationTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;

        _adapterUrl = Environment.GetEnvironmentVariable("POLYGON_ADAPTER_BASE_URL") ?? "http://localhost:3002/v1/adapter/";
        _apiKey = Environment.GetEnvironmentVariable("POLYGON_ADAPTER_API_KEY") ?? "dev-api-key-change-me";
    }

    private string GetBlockchainConfig()
    {
        return System.Text.Json.JsonSerializer.Serialize(new
        {
            network = "amoy",
            adapterUrl = _adapterUrl,
            apiKey = _apiKey
        });
    }

    private async Task AddUserWalletAsync(Guid userId, string address)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();

        var wallet = new UserWalletAddress
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BlockchainType = BlockchainType.Polygon,
            Address = address,
            Label = "Test Wallet",
            IsPrimary = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.UserWalletAddresses.Add(wallet);
        await dbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task CreateOrganization_WithPolygon_ShouldSucceed()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = $"Polygon Org {Guid.NewGuid()}",
            Description = "Integration test organization",
            BlockchainType = BlockchainType.Polygon,
            BlockchainConfig = GetBlockchainConfig(),
            EnableBlockchainFeature = true,
            InitialAdminUserId = adminUserId
        };

        // Act
        var response = await _client.PostAsJsonAsync("/organizations", request);

        // Assert
        if (response.StatusCode != HttpStatusCode.Created)
        {
            var error = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Failed to create Polygon organization: {error}");
        }
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var organization = await response.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);
        Assert.Equal(BlockchainType.Polygon, organization.BlockchainType);
        Assert.Contains("Polygon", organization.BlockchainAccountAddress ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateProposal_WithPolygon_ShouldSucceed()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"Polygon Proposal Org {Guid.NewGuid()}",
            Description = "Integration test organization for proposals",
            BlockchainType = BlockchainType.Polygon,
            BlockchainConfig = GetBlockchainConfig(),
            EnableBlockchainFeature = true,
            InitialAdminUserId = adminUserId
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var organization = await orgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Polygon Proposal",
            Description = "Polygon Description",
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7),
            CreatedByUserId = adminUserId
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/proposals", proposalRequest);

        // Assert
        if (response.StatusCode != HttpStatusCode.Created)
        {
            var error = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Failed to create polygon proposal: {error}");
        }
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var proposal = await response.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(proposal);

        var optionAResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option A" });
        Assert.Equal(HttpStatusCode.Created, optionAResponse.StatusCode);
        var optionA = await optionAResponse.Content.ReadFromJsonAsync<ProposalOptionDto>();
        Assert.NotNull(optionA);

        var optionBResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option B" });
        Assert.Equal(HttpStatusCode.Created, optionBResponse.StatusCode);
        var optionB = await optionBResponse.Content.ReadFromJsonAsync<ProposalOptionDto>();
        Assert.NotNull(optionB);

        var openResponse = await _client.PostAsync($"/proposals/{proposal.Id}/open", null);
        if (openResponse.StatusCode != HttpStatusCode.OK)
        {
            var error = await openResponse.Content.ReadAsStringAsync();
            _output.WriteLine($"Failed to open polygon proposal: {error}");
        }
        Assert.Equal(HttpStatusCode.OK, openResponse.StatusCode);

        var openedProposal = await openResponse.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(openedProposal);
        Assert.Contains("Polygon", openedProposal.BlockchainTransactionId ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CastVote_WithPolygon_ShouldSucceed()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"Polygon Vote Org {Guid.NewGuid()}",
            Description = "Integration test organization for polygon voting",
            BlockchainType = BlockchainType.Polygon,
            BlockchainConfig = GetBlockchainConfig(),
            EnableBlockchainFeature = true,
            InitialAdminUserId = adminUserId
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var organization = await orgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        var (userDto, userToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var userId = userDto.Id;

        await AddUserWalletAsync(userId, "0x1111111111111111111111111111111111111111");

        var memberRequest = new CreateMembershipRequest { UserId = userId, Role = OrganizationRole.Member };
        var memberResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/memberships", memberRequest);
        Assert.Equal(HttpStatusCode.Created, memberResponse.StatusCode);

        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Polygon Voting Shares",
            Symbol = "PVOTE",
            Description = "Shares for polygon voting",
            VotingWeight = 1.0m,
            TokenDecimals = 0
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/share-types", shareTypeRequest);
        Assert.Equal(HttpStatusCode.Created, shareTypeResponse.StatusCode);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();
        Assert.NotNull(shareType);

        var issuanceRequest = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareType.Id,
            Quantity = 50,
            Reason = "Initial polygon issuance"
        };
        var issuanceResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/share-issuances", issuanceRequest);
        Assert.Equal(HttpStatusCode.Created, issuanceResponse.StatusCode);

        var proposalRequest = new CreateProposalRequest
        {
            Title = "Polygon Vote Test Proposal",
            Description = "Polygon Vote Test Description",
            StartAt = DateTimeOffset.UtcNow.AddMinutes(-1),
            EndAt = DateTimeOffset.UtcNow.AddDays(7),
            CreatedByUserId = adminUserId
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/proposals", proposalRequest);
        Assert.Equal(HttpStatusCode.Created, proposalResponse.StatusCode);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(proposal);

        var optionResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Yes" });
        Assert.Equal(HttpStatusCode.Created, optionResponse.StatusCode);
        var option = await optionResponse.Content.ReadFromJsonAsync<ProposalOptionDto>();
        Assert.NotNull(option);
        var secondOptionResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "No" });
        Assert.Equal(HttpStatusCode.Created, secondOptionResponse.StatusCode);

        var openResponse = await _client.PostAsync($"/proposals/{proposal.Id}/open", null);
        Assert.Equal(HttpStatusCode.OK, openResponse.StatusCode);

        _client.AddAuthorizationHeader(userToken);

        var voteRequest = new CastVoteRequest
        {
            ProposalOptionId = option.Id,
            UserId = userId
        };

        // Act
        var voteResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", voteRequest);

        // Assert
        if (voteResponse.StatusCode != HttpStatusCode.Created)
        {
            var error = await voteResponse.Content.ReadAsStringAsync();
            _output.WriteLine($"Failed to cast polygon vote: {error}");
        }
        Assert.Equal(HttpStatusCode.Created, voteResponse.StatusCode);

        var vote = await voteResponse.Content.ReadFromJsonAsync<VoteDto>();
        Assert.NotNull(vote);
        Assert.Contains("Polygon", vote.BlockchainTransactionId ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }
}
