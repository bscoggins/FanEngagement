using FanEngagement.Api;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace FanEngagement.Tests;

/// <summary>
/// Test factory specifically for rate limiting tests.
/// Uses the default (lower) rate limits to properly test rate limiting behavior.
/// Note: When used with IClassFixture, rate limiter state is shared across all tests in the fixture class.
/// </summary>
public class RateLimitingTestWebApplicationFactory : TestWebApplicationFactoryBase
{
    protected override void ConfigureTestSpecificSettings(IWebHostBuilder builder)
    {
        // Configure actual rate limits for testing (low values to verify rate limiting works)
        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // Set actual rate limits from requirements to test rate limiting behavior
                ["RateLimiting:Login:PermitLimit"] = "5",
                ["RateLimiting:Login:WindowMinutes"] = "1",
                ["RateLimiting:Registration:PermitLimit"] = "10",
                ["RateLimiting:Registration:WindowHours"] = "1",
                ["RateLimiting:AuditExport:PermitLimit"] = "5",
                ["RateLimiting:AuditExport:WindowHours"] = "1"
            });
        });
    }
}
