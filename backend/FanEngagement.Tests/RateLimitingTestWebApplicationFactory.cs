using FanEngagement.Api;

namespace FanEngagement.Tests;

/// <summary>
/// Test factory specifically for rate limiting tests.
/// Uses the default (lower) rate limits to properly test rate limiting behavior.
/// Note: When used with IClassFixture, rate limiter state is shared across all tests in the fixture class.
/// </summary>
public class RateLimitingTestWebApplicationFactory : TestWebApplicationFactoryBase
{
    // No additional configuration needed - uses default rate limits from appsettings.json
}
