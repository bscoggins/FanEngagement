using System.Net;
using System.Net.Http.Json;
using System.Linq;
using FanEngagement.Application.FeatureFlags;
using FanEngagement.Application.Organizations;
using FanEngagement.Domain.Enums;

namespace FanEngagement.Tests;

public class FeatureFlagTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public FeatureFlagTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _client.BaseAddress ??= factory.Server.BaseAddress;
    }

    [Fact]
    public async Task GetFeatureFlags_ReturnsDefaults()
    {
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var organization = await CreateOrganizationAsync();

        var response = await _client.GetAsync($"/organizations/{organization.Id}/feature-flags");
        response.EnsureSuccessStatusCode();

        var flags = await response.Content.ReadFromJsonAsync<List<FeatureFlagDto>>();
        Assert.NotNull(flags);
        var blockchainFlag = flags!.Single(f => f.Feature == OrganizationFeature.BlockchainIntegration);
        Assert.False(blockchainFlag.IsEnabled);
    }

    [Fact]
    public async Task SetFeatureFlag_EnablesBlockchainIntegration()
    {
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var organization = await CreateOrganizationAsync();

        var enableResponse = await _client.PutAsJsonAsync($"/organizations/{organization.Id}/feature-flags/BlockchainIntegration", new { enabled = true });
        Assert.Equal(HttpStatusCode.OK, enableResponse.StatusCode);

        var flagsResponse = await _client.GetAsync($"/organizations/{organization.Id}/feature-flags");
        flagsResponse.EnsureSuccessStatusCode();

        var flags = await flagsResponse.Content.ReadFromJsonAsync<List<FeatureFlagDto>>();
        Assert.NotNull(flags);
        var blockchainFlag = flags!.Single(f => f.Feature == OrganizationFeature.BlockchainIntegration);
        Assert.True(blockchainFlag.IsEnabled);
    }

    private async Task<FanEngagement.Domain.Entities.Organization> CreateOrganizationAsync()
    {
        var request = new CreateOrganizationRequest
        {
            Name = $"Org {Guid.NewGuid():N}",
            Description = "Feature flag test org"
        };

        var response = await _client.PostAsJsonAsync("/organizations", request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>()
            ?? throw new InvalidOperationException("Organization response could not be parsed.");
    }
}
