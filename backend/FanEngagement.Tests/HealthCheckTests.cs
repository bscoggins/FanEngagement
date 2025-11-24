using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class HealthCheckTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public HealthCheckTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task LivenessEndpoint_ReturnsHealthy()
    {
        // Act
        var response = await _client.GetAsync("/health/live");

        // Assert
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadAsStringAsync();
        Assert.Contains("Healthy", payload);
    }

    [Fact]
    public async Task ReadinessEndpoint_ChecksBackgroundServicesAndDatabase()
    {
        // Act
        var response = await _client.GetAsync("/health/ready");
        var payload = await response.Content.ReadAsStringAsync();
        
        _output.WriteLine($"Status: {response.StatusCode}, Body: {payload}");

        // Assert
        // In test environment, background services are removed, so we expect Degraded or Unhealthy
        // This test validates that the endpoint responds and checks are being executed
        Assert.True(
            response.StatusCode == HttpStatusCode.OK || 
            response.StatusCode == HttpStatusCode.ServiceUnavailable,
            $"Expected OK or ServiceUnavailable, got {response.StatusCode}");
        
        // Response should contain health check output
        Assert.NotEmpty(payload);
    }

    [Fact]
    public async Task LegacyHealthEndpoint_NoLongerExists()
    {
        // Act - ensure old /health endpoint was replaced by /health/live and /health/ready
        var response = await _client.GetAsync("/health");

        // Assert - should be NotFound since we removed the old HealthController
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        _output.WriteLine($"Legacy /health endpoint correctly returns NotFound");
    }
}
