using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Organizations;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class OrganizationCreationIntegrationTests : IClassFixture<SolanaOnChainTestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly SolanaOnChainTestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public OrganizationCreationIntegrationTests(SolanaOnChainTestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateOrganization_WithSolanaIntegration_ShouldSucceedAndPopulateAddress()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = $"Solana Org {Guid.NewGuid()}",
            Description = "Integration test organization",
            BlockchainType = BlockchainType.Solana,
            BlockchainConfig = "{\"network\": \"localnet\"}",
            EnableBlockchainFeature = true,
            InitialAdminUserId = adminUserId
        };

        // Act
        _output.WriteLine($"Creating organization: {request.Name}");
        var response = await _client.PostAsJsonAsync("/organizations", request);

        // Assert
        if (response.StatusCode != HttpStatusCode.Created)
        {
            var error = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Failed with status {response.StatusCode}. Error: {error}");
        }

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var organization = await response.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);
        Assert.Equal(request.Name, organization.Name);
        Assert.Equal(BlockchainType.Solana, organization.BlockchainType);
        
        // This is the critical check - if this is populated, the adapter call succeeded
        Assert.False(string.IsNullOrWhiteSpace(organization.BlockchainAccountAddress), "BlockchainAccountAddress should be populated");
        
        _output.WriteLine($"Organization created successfully with address: {organization.BlockchainAccountAddress}");
    }
}
