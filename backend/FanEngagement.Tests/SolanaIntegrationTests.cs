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

[Trait("Category", "SolanaIntegration")]
public class SolanaIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;
    private readonly string _adapterUrl;
    private readonly string _apiKey;

    public SolanaIntegrationTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
        
        // Default to localhost for local testing, can be overridden by env vars
        _adapterUrl = Environment.GetEnvironmentVariable("SOLANA_ADAPTER_BASE_URL") ?? "http://localhost:3001/v1/adapter/";
        _apiKey = Environment.GetEnvironmentVariable("SOLANA_ADAPTER_API_KEY") ?? "dev-api-key-change-me";
    }

    private string GetBlockchainConfig()
    {
        return System.Text.Json.JsonSerializer.Serialize(new
        {
            network = "devnet",
            adapterUrl = _adapterUrl,
            apiKey = _apiKey
        });
    }

    private async Task AddUserWalletAsync(Guid userId, string address, BlockchainType type = BlockchainType.Solana)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        
        var wallet = new UserWalletAddress
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BlockchainType = type,
            Address = address,
            Label = "Test Wallet",
            IsPrimary = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        
        dbContext.UserWalletAddresses.Add(wallet);
        await dbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task CreateOrganization_WithSolana_ShouldSucceed()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = $"Solana Org {Guid.NewGuid()}",
            Description = "Integration test organization",
            BlockchainType = BlockchainType.Solana,
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
            _output.WriteLine($"Failed to create organization: {error}");
        }
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var organization = await response.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);
        Assert.Equal(BlockchainType.Solana, organization.BlockchainType);
        Assert.False(string.IsNullOrWhiteSpace(organization.BlockchainAccountAddress), "BlockchainAccountAddress should be populated (transaction signature)");
        
        _output.WriteLine($"Organization created. Transaction Signature: {organization.BlockchainAccountAddress}");
    }

    [Fact]
    public async Task CreateProposal_WithSolana_ShouldSucceed()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // 1. Create Organization
        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"Solana Proposal Org {Guid.NewGuid()}",
            Description = "Integration test organization for proposals",
            BlockchainType = BlockchainType.Solana,
            BlockchainConfig = GetBlockchainConfig(),
            EnableBlockchainFeature = true,
            InitialAdminUserId = adminUserId
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var organization = await orgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        // 2. Create Proposal
        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test Description",
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
            _output.WriteLine($"Failed to create proposal: {error}");
        }
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var proposal = await response.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(proposal);
        
        // 3. Add Options (At least 2 required)
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option A" });
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "Option B" });

        // 4. Open Proposal (This triggers blockchain registration)
        var openResponse = await _client.PostAsync($"/proposals/{proposal.Id}/open", null);
        
        if (openResponse.StatusCode != HttpStatusCode.OK)
        {
            var error = await openResponse.Content.ReadAsStringAsync();
            _output.WriteLine($"Failed to open proposal: {error}");
        }
        Assert.Equal(HttpStatusCode.OK, openResponse.StatusCode);
        
        var openedProposal = await openResponse.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(openedProposal);
        Assert.False(string.IsNullOrWhiteSpace(openedProposal.BlockchainTransactionId), "BlockchainTransactionId should be populated (transaction signature)");
        
        _output.WriteLine($"Proposal opened. Transaction Signature: {openedProposal.BlockchainTransactionId}");
    }

    [Fact]
    public async Task CastVote_WithSolana_ShouldSucceed()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // 1. Create Organization
        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"Solana Vote Org {Guid.NewGuid()}",
            Description = "Integration test organization for voting",
            BlockchainType = BlockchainType.Solana,
            BlockchainConfig = GetBlockchainConfig(),
            EnableBlockchainFeature = true,
            InitialAdminUserId = adminUserId
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var organization = await orgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        // 2. Create User
        var (userDto, userToken) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(_client);
        var userId = userDto.Id;
        
        // Seed wallet for user
        await AddUserWalletAsync(userId, "7Ez6h7X1Yp8Q9Z0k1W2R3S4T5U6V7W8X9Y0Z1A2B3C4D");

        // 3. Add User as Member
        var memberRequest = new CreateMembershipRequest { UserId = userId, Role = OrganizationRole.Member };
        var memberResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/memberships", memberRequest);
        Assert.Equal(HttpStatusCode.Created, memberResponse.StatusCode);

        // 4. Create Share Type
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Voting Shares",
            Symbol = "VOTE",
            Description = "Shares for voting",
            VotingWeight = 1.0m,
            TokenDecimals = 0
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/share-types", shareTypeRequest);
        Assert.Equal(HttpStatusCode.Created, shareTypeResponse.StatusCode);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();
        Assert.NotNull(shareType);

        // 5. Issue Shares to User
        var issuanceRequest = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareType.Id,
            Quantity = 100,
            Reason = "Initial issuance"
        };
        var issuanceResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/share-issuances", issuanceRequest);
        Assert.Equal(HttpStatusCode.Created, issuanceResponse.StatusCode);

        // 6. Create Proposal (Snapshot taken now)
        var proposalRequest = new CreateProposalRequest
        {
            Title = "Vote Test Proposal",
            Description = "Vote Test Description",
            StartAt = DateTimeOffset.UtcNow.AddMinutes(-1), // Active now
            EndAt = DateTimeOffset.UtcNow.AddDays(7),
            CreatedByUserId = adminUserId
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{organization.Id}/proposals", proposalRequest);
        Assert.Equal(HttpStatusCode.Created, proposalResponse.StatusCode);
        var proposal = await proposalResponse.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(proposal);

        // 7. Add Option
        var optionRequest = new AddProposalOptionRequest { Text = "Yes" };
        var optionResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", optionRequest);
        Assert.Equal(HttpStatusCode.Created, optionResponse.StatusCode);
        var option = await optionResponse.Content.ReadFromJsonAsync<ProposalOptionDto>();
        Assert.NotNull(option);

        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest { Text = "No" });

        // 8. Open Proposal (if needed, usually Draft -> Open)
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // 9. Cast Vote (Switch to User context)
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
            _output.WriteLine($"Failed to cast vote: {error}");
        }
        Assert.Equal(HttpStatusCode.Created, voteResponse.StatusCode);

        var vote = await voteResponse.Content.ReadFromJsonAsync<VoteDto>();
        Assert.NotNull(vote);
        Assert.False(string.IsNullOrWhiteSpace(vote.BlockchainTransactionId), "BlockchainTransactionId should be populated (transaction signature)");
        
        _output.WriteLine($"Vote cast. Transaction Signature: {vote.BlockchainTransactionId}");
    }
}
