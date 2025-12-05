using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Organizations;
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
            BlockchainConfig = "{\"adapterUrl\":\"http://localhost:3001\",\"network\":\"devnet\"}"
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
            BlockchainConfig = "{\"adapterUrl\":\"http://localhost:3001\"}"
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
}
