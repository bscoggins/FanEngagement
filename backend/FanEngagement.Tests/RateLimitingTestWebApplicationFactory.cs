using FanEngagement.Api;

namespace FanEngagement.Tests;

/// <summary>
/// Test factory specifically for rate limiting tests.
/// Uses the default (lower) rate limits to properly test rate limiting behavior.
/// Each test creates its own factory instance to ensure rate limiter state isolation.
/// </summary>
public class RateLimitingTestWebApplicationFactory : TestWebApplicationFactoryBase
{
    // No additional configuration needed - uses default rate limits from appsettings.json
}
