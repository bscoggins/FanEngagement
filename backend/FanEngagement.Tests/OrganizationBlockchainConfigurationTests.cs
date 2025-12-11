using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Proposals;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class OrganizationBlockchainConfigurationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public OrganizationBlockchainConfigurationTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _client.BaseAddress ??= factory.Server.BaseAddress;
        _output = output;
    }

    [Fact]
    public async Task CreateOrganization_WithBlockchainType_CreatesOrgWithBlockchainConfig()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test Organization with blockchain",
            BlockchainType = BlockchainType.Solana,
            BlockchainConfig = BuildSolanaConfig()
        };

        // Act
        var createResponse = await _client.PostAsJsonAsync("/organizations", request);

        // Assert
        if (createResponse.StatusCode != HttpStatusCode.Created)
        {
            var body = await createResponse.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {createResponse.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var organization = await createResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);
        Assert.Equal(BlockchainType.Solana, organization!.BlockchainType);
        Assert.Equal(request.BlockchainConfig, organization.BlockchainConfig);
    }

    [Fact]
    public async Task CreateOrganization_WithoutBlockchainType_DefaultsToNone()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test Organization without blockchain"
        };

        // Act
        var createResponse = await _client.PostAsJsonAsync("/organizations", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var organization = await createResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);
        Assert.Equal(BlockchainType.None, organization!.BlockchainType);
        Assert.Null(organization.BlockchainConfig);
    }

    [Fact]
    public async Task UpdateOrganization_ChangeBlockchainType_Succeeds()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization without blockchain
        var createRequest = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test Organization"
        };
        var createResponse = await _client.PostAsJsonAsync("/organizations", createRequest);
        var organization = await createResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        // Act - Update to add blockchain type
        var updateRequest = new UpdateOrganizationRequest
        {
            Name = organization!.Name,
            Description = organization.Description,
            BlockchainType = BlockchainType.Polygon,
            BlockchainConfig = "{\"adapterUrl\":\"http://localhost:3002\"}"
        };
        var updateResponse = await _client.PutAsJsonAsync($"/organizations/{organization.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updatedOrg = await updateResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(updatedOrg);
        Assert.Equal(BlockchainType.Polygon, updatedOrg!.BlockchainType);
        Assert.Equal(updateRequest.BlockchainConfig, updatedOrg.BlockchainConfig);
    }

    [Fact]
    public async Task UpdateOrganization_ChangeBlockchainTypeWithExistingShares_ReturnsBadRequest()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization
        var createRequest = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test Organization",
            BlockchainType = BlockchainType.None
        };
        var createResponse = await _client.PostAsJsonAsync("/organizations", createRequest);
        var organization = await createResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        // Create a share type for the organization
        var shareTypeRequest = new
        {
            name = "Test Share",
            symbol = "TST",
            votingWeight = 1.0,
            isTransferable = true
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{organization!.Id}/share-types", shareTypeRequest);
        Assert.Equal(HttpStatusCode.Created, shareTypeResponse.StatusCode);

        // Act - Try to update blockchain type after share type exists
        var updateRequest = new UpdateOrganizationRequest
        {
            Name = organization.Name,
            Description = organization.Description,
            BlockchainType = BlockchainType.Solana
        };
        var updateResponse = await _client.PutAsJsonAsync($"/organizations/{organization.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
    }

    [Fact]
    public async Task GetOrganization_ReturnsBlockchainConfiguration()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var createRequest = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test Organization",
            BlockchainType = BlockchainType.Solana,
            BlockchainConfig = BuildSolanaConfig()
        };
        var createResponse = await _client.PostAsJsonAsync("/organizations", createRequest);
        var createdOrg = await createResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(createdOrg);

        // Act
        var getResponse = await _client.GetAsync($"/organizations/{createdOrg!.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        var organization = await getResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);
        Assert.Equal(BlockchainType.Solana, organization!.BlockchainType);
        Assert.Equal(createRequest.BlockchainConfig, organization.BlockchainConfig);
    }

    [Fact]
    public async Task UpdateOrganization_ChangeFromSolanaToNoneWithExistingShares_ReturnsBadRequest()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization with Solana blockchain
        var createRequest = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test Organization",
            BlockchainType = BlockchainType.Solana,
            BlockchainConfig = BuildSolanaConfig()
        };
        var createResponse = await _client.PostAsJsonAsync("/organizations", createRequest);
        var organization = await createResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        // Create a share type for the organization
        var shareTypeRequest = new
        {
            name = "Test Share",
            symbol = "TST",
            votingWeight = 1.0,
            isTransferable = true
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{organization!.Id}/share-types", shareTypeRequest);
        Assert.Equal(HttpStatusCode.Created, shareTypeResponse.StatusCode);

        // Act - Try to change from Solana to None after share type exists
        var updateRequest = new UpdateOrganizationRequest
        {
            Name = organization.Name,
            Description = organization.Description,
            BlockchainType = BlockchainType.None
        };
        var updateResponse = await _client.PutAsJsonAsync($"/organizations/{organization.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
    }

    [Fact]
    public async Task UpdateOrganization_ChangeBlockchainTypeWithExistingProposals_ReturnsBadRequest()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization
        var createRequest = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test Organization",
            BlockchainType = BlockchainType.None
        };
        var createResponse = await _client.PostAsJsonAsync("/organizations", createRequest);
        var organization = await createResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        // Create a proposal for the organization (no shares needed)
        var proposalRequest = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test proposal description",
            CreatedByUserId = adminUserId,
            StartAt = DateTimeOffset.UtcNow.AddDays(1),
            EndAt = DateTimeOffset.UtcNow.AddDays(7)
        };
        var proposalResponse = await _client.PostAsJsonAsync($"/organizations/{organization!.Id}/proposals", proposalRequest);
        Assert.Equal(HttpStatusCode.Created, proposalResponse.StatusCode);

        // Act - Try to update blockchain type after proposal exists
        var updateRequest = new UpdateOrganizationRequest
        {
            Name = organization.Name,
            Description = organization.Description,
            BlockchainType = BlockchainType.Solana
        };
        var updateResponse = await _client.PutAsJsonAsync($"/organizations/{organization.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
    }

    private static string BuildSolanaConfig()
    {
        var adapterUrl = Environment.GetEnvironmentVariable("SOLANA_ADAPTER_BASE_URL") ?? "http://localhost:3001/v1/adapter/";
        var apiKey = Environment.GetEnvironmentVariable("SOLANA_ADAPTER_API_KEY") ?? "dev-api-key-change-in-production";

        return JsonSerializer.Serialize(new
        {
            adapterUrl,
            apiKey,
            network = "localnet"
        });
    }
}
