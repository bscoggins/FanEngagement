using FanEngagement.Api;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace FanEngagement.Tests;

/// <summary>
/// Test factory for standard integration tests.
/// Uses very high rate limits (1000) to prevent rate limiting from interfering with tests.
/// </summary>
public class TestWebApplicationFactory : TestWebApplicationFactoryBase
{
    protected override void ConfigureTestSpecificSettings(IWebHostBuilder builder)
    {
        // Configure test-specific settings (higher rate limits for tests)
        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // Set very high rate limits for tests to avoid interference between tests
                ["RateLimiting:Login:PermitLimit"] = "1000",
                ["RateLimiting:Login:WindowMinutes"] = "1",
                ["RateLimiting:Registration:PermitLimit"] = "1000",
                ["RateLimiting:Registration:WindowHours"] = "1",
                ["RateLimiting:AuditExport:PermitLimit"] = "1000",
                ["RateLimiting:AuditExport:WindowHours"] = "1",
                
                // Configure API keys for blockchain adapters
                ["BlockchainAdapters:Solana:ApiKey"] = "test-api-key",
                ["BlockchainAdapters:Polygon:ApiKey"] = "test-api-key"
            });
        });
    }
}
