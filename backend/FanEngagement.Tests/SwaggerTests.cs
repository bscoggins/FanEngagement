using System.Net;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class SwaggerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public SwaggerTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task SwaggerUI_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/swagger/index.html");

        // Assert
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("swagger", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SwaggerJson_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/swagger/v1/swagger.json");

        // Assert
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var body = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"Status: {response.StatusCode}, Body: {body}");
        }

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var content = await response.Content.ReadAsStringAsync();
        
        // Verify it's valid OpenAPI JSON with expected content
        Assert.Contains("\"openapi\":", content);
        Assert.Contains("FanEngagement API", content);
        Assert.Contains("Bearer", content); // JWT security scheme should be present
    }

    [Fact]
    public async Task SwaggerJson_ContainsControllerApiEndpoints()
    {
        // Act
        var response = await _client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();
        
        _output.WriteLine($"Swagger JSON Content (first 2000 chars): {content[..Math.Min(2000, content.Length)]}");

        // Assert - verify key controller-based API endpoints are documented
        // Note: Health check endpoints are minimal API endpoints, not controllers
        Assert.Contains("/auth/login", content);
        Assert.Contains("/users", content);
        Assert.Contains("/organizations", content);
    }

    [Fact]
    public async Task SwaggerJson_ContainsSecurityScheme()
    {
        // Act
        var response = await _client.GetAsync("/swagger/v1/swagger.json");
        var content = await response.Content.ReadAsStringAsync();

        // Assert - verify JWT security scheme is defined (OpenAPI 3.x uses "securitySchemes" not "securityDefinitions")
        Assert.Contains("securitySchemes", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Bearer", content);
        Assert.Contains("JWT", content);
    }
}
