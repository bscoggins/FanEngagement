using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.WebhookEndpoints;
using FanEngagement.Domain.Entities;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class WebhookEndpointTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public WebhookEndpointTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateWebhookEndpoint_ReturnsCreated_WithValidData()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var request = new CreateWebhookEndpointRequest(
            "https://example.com/webhook",
            "secret123",
            new List<string> { "ProposalCreated", "ProposalFinalized" }
        );

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org.Id}/webhooks", request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var webhook = await response.Content.ReadFromJsonAsync<WebhookEndpointDto>();
        Assert.NotNull(webhook);
        Assert.Equal(org.Id, webhook!.OrganizationId);
        Assert.Equal("https://example.com/webhook", webhook.Url);
        Assert.Equal(2, webhook.SubscribedEvents.Count);
        Assert.Contains("ProposalCreated", webhook.SubscribedEvents);
        Assert.Contains("ProposalFinalized", webhook.SubscribedEvents);
        Assert.True(webhook.IsActive);
    }

    [Fact]
    public async Task CreateWebhookEndpoint_ReturnsBadRequest_WithInvalidUrl()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var request = new CreateWebhookEndpointRequest(
            "not-a-valid-url",
            "secret123",
            new List<string> { "ProposalCreated" }
        );

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org.Id}/webhooks", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateWebhookEndpoint_ReturnsBadRequest_WithNoSubscribedEvents()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var request = new CreateWebhookEndpointRequest(
            "https://example.com/webhook",
            "secret123",
            new List<string>()
        );

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org.Id}/webhooks", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateWebhookEndpoint_ReturnsNotFound_WithInvalidOrganization()
    {
        // Arrange
        var request = new CreateWebhookEndpointRequest(
            "https://example.com/webhook",
            "secret123",
            new List<string> { "ProposalCreated" }
        );

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{Guid.NewGuid()}/webhooks", request);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetAllWebhookEndpoints_ReturnsEmptyList_WhenNoWebhooks()
    {
        // Arrange
        var org = await CreateOrganizationAsync();

        // Act
        var response = await _client.GetAsync($"/organizations/{org.Id}/webhooks");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var webhooks = await response.Content.ReadFromJsonAsync<List<WebhookEndpointDto>>();
        Assert.NotNull(webhooks);
        Assert.Empty(webhooks!);
    }

    [Fact]
    public async Task GetAllWebhookEndpoints_ReturnsWebhooks_ForOrganization()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var webhook1 = await CreateWebhookAsync(org.Id, "https://example.com/webhook1");
        var webhook2 = await CreateWebhookAsync(org.Id, "https://example.com/webhook2");

        // Act
        var response = await _client.GetAsync($"/organizations/{org.Id}/webhooks");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var webhooks = await response.Content.ReadFromJsonAsync<List<WebhookEndpointDto>>();
        Assert.NotNull(webhooks);
        Assert.Equal(2, webhooks!.Count);
    }

    [Fact]
    public async Task GetWebhookEndpointById_ReturnsWebhook_WhenExists()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var webhook = await CreateWebhookAsync(org.Id, "https://example.com/webhook");

        // Act
        var response = await _client.GetAsync($"/organizations/{org.Id}/webhooks/{webhook.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<WebhookEndpointDto>();
        Assert.NotNull(result);
        Assert.Equal(webhook.Id, result!.Id);
        Assert.Equal(webhook.Url, result.Url);
    }

    [Fact]
    public async Task GetWebhookEndpointById_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange
        var org = await CreateOrganizationAsync();

        // Act
        var response = await _client.GetAsync($"/organizations/{org.Id}/webhooks/{Guid.NewGuid()}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateWebhookEndpoint_ReturnsUpdatedWebhook_WithValidData()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var webhook = await CreateWebhookAsync(org.Id, "https://example.com/webhook");
        var updateRequest = new UpdateWebhookEndpointRequest(
            "https://example.com/new-webhook",
            "newsecret456",
            new List<string> { "ProposalCreated", "ProposalFinalized", "VoteCast" }
        );

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{org.Id}/webhooks/{webhook.Id}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<WebhookEndpointDto>();
        Assert.NotNull(updated);
        Assert.Equal(webhook.Id, updated!.Id);
        Assert.Equal("https://example.com/new-webhook", updated.Url);
        Assert.Equal(3, updated.SubscribedEvents.Count);
    }

    [Fact]
    public async Task UpdateWebhookEndpoint_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var updateRequest = new UpdateWebhookEndpointRequest(
            "https://example.com/webhook",
            "secret123",
            new List<string> { "ProposalCreated" }
        );

        // Act
        var response = await _client.PutAsJsonAsync($"/organizations/{org.Id}/webhooks/{Guid.NewGuid()}", updateRequest);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteWebhookEndpoint_ReturnsNoContent_WhenExists()
    {
        // Arrange
        var org = await CreateOrganizationAsync();
        var webhook = await CreateWebhookAsync(org.Id, "https://example.com/webhook");

        // Act
        var response = await _client.DeleteAsync($"/organizations/{org.Id}/webhooks/{webhook.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Verify it's soft deleted (IsActive = false)
        var getResponse = await _client.GetAsync($"/organizations/{org.Id}/webhooks/{webhook.Id}");
        var result = await getResponse.Content.ReadFromJsonAsync<WebhookEndpointDto>();
        Assert.NotNull(result);
        Assert.False(result!.IsActive);
    }

    [Fact]
    public async Task DeleteWebhookEndpoint_ReturnsNotFound_WhenDoesNotExist()
    {
        // Arrange
        var org = await CreateOrganizationAsync();

        // Act
        var response = await _client.DeleteAsync($"/organizations/{org.Id}/webhooks/{Guid.NewGuid()}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private async Task<Organization> CreateOrganizationAsync()
    {
        var createOrgResponse = await _client.PostAsJsonAsync("/organizations",
            new CreateOrganizationRequest { Name = "Test Organization" });
        Assert.Equal(HttpStatusCode.Created, createOrgResponse.StatusCode);
        var org = await createOrgResponse.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(org);
        return org!;
    }

    private async Task<WebhookEndpointDto> CreateWebhookAsync(Guid organizationId, string url)
    {
        var request = new CreateWebhookEndpointRequest(
            url,
            "secret123",
            new List<string> { "ProposalCreated", "ProposalFinalized" }
        );
        var response = await _client.PostAsJsonAsync($"/organizations/{organizationId}/webhooks", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var webhook = await response.Content.ReadFromJsonAsync<WebhookEndpointDto>();
        Assert.NotNull(webhook);
        return webhook!;
    }
}
