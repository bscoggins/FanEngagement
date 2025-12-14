using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Organizations;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class OrganizationBlockchainCreationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public OrganizationBlockchainCreationTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateOrganization_WithSolanaBlockchain_Succeeds()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = $"Solana Org {Guid.NewGuid()}",
            Description = "Organization with Solana integration",
            BlockchainType = BlockchainType.Solana,
            BlockchainConfig = "{\"network\": \"localnet\"}",
            EnableBlockchainFeature = true,
            InitialAdminUserId = adminUserId
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
        Assert.Equal(BlockchainType.Solana, organization.BlockchainType);
        
        // Verify feature flag is enabled
        var featureFlagsResponse = await _client.GetAsync($"/organizations/{organization.Id}/feature-flags");
        Assert.Equal(HttpStatusCode.OK, featureFlagsResponse.StatusCode);
        // Note: We might need to parse the feature flags response to verify specifically
    }
}
