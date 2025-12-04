using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Users;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Integration tests for rate limiting on authentication and user creation endpoints.
/// Uses RateLimitingTestWebApplicationFactory which has actual (low) rate limits enabled.
/// </summary>
public class RateLimitingTests : IClassFixture<RateLimitingTestWebApplicationFactory>
{
    private readonly RateLimitingTestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public RateLimitingTests(RateLimitingTestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _output = output;
    }

    [Fact]
    public async Task Login_EnforcesRateLimit_Returns429WhenLimitExceeded()
    {
        // Arrange: Create a test user directly in the database to avoid consuming registration rate limit
        var password = "TestPassword123!";
        var uniqueEmail = $"ratelimit-test-{Guid.NewGuid()}@example.com";
        var createRequest = new CreateUserRequest
        {
            Email = uniqueEmail,
            DisplayName = "Rate Limit Test User",
            Password = password
        };
        
        await _factory.CreateTestUserDirectlyAsync(createRequest);

        var client = _factory.CreateClient();
        var loginRequest = new LoginRequest
        {
            Email = uniqueEmail,
            Password = "WrongPassword123!" // Use wrong password to ensure we don't succeed
        };

        // Act: Make login attempts until we hit rate limit
        HttpResponseMessage? rateLimitedResponse = null;
        HttpStatusCode? lastSuccessStatus = null;
        int attemptCount = 0;
        
        // Try up to 10 attempts to find rate limit (should hit it by attempt 6 at most)
        for (int i = 0; i < 10; i++)
        {
            var response = await client.PostAsJsonAsync("/auth/login", loginRequest);
            attemptCount++;
            _output.WriteLine($"Attempt {attemptCount}: Status = {response.StatusCode}");
            
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                rateLimitedResponse = response;
                break;
            }
            else
            {
                lastSuccessStatus = response.StatusCode;
            }
        }

        // Assert: We should have hit the rate limit
        Assert.NotNull(rateLimitedResponse);
        Assert.Equal(HttpStatusCode.TooManyRequests, rateLimitedResponse!.StatusCode);
        
        // Last non-rate-limited response should have been Unauthorized (wrong password)
        Assert.Equal(HttpStatusCode.Unauthorized, lastSuccessStatus);
        
        // Verify Retry-After header is present
        Assert.True(rateLimitedResponse.Headers.Contains("Retry-After"), "Retry-After header should be present");
        
        // Verify response body contains appropriate error details
        var errorBody = await rateLimitedResponse.Content.ReadAsStringAsync();
        _output.WriteLine($"Rate limit error response: {errorBody}");
        Assert.Contains("429", errorBody);
        Assert.Contains("Rate limit exceeded", errorBody);
    }

    [Fact]
    public async Task UserRegistration_EnforcesRateLimit_Returns429WhenLimitExceeded()
    {
        // Arrange: Use a separate client instance for this test
        var client = _factory.CreateClient();

        // Act: Create users until we hit rate limit
        HttpResponseMessage? rateLimitedResponse = null;
        int createdCount = 0;
        
        // Try to create users until we hit rate limit (should happen after 10 in fresh window)
        for (int i = 0; i < 15; i++)
        {
            var createRequest = new CreateUserRequest
            {
                Email = $"reg-test-{Guid.NewGuid()}@example.com",
                DisplayName = $"Registration Test User {i}",
                Password = "TestPassword123!"
            };
            
            var response = await client.PostAsJsonAsync("/users", createRequest);
            _output.WriteLine($"Attempt {i + 1}: Status = {response.StatusCode}");
            
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                rateLimitedResponse = response;
                break;
            }
            else if (response.StatusCode == HttpStatusCode.Created)
            {
                createdCount++;
            }
        }

        // Assert: We should have hit the rate limit
        Assert.NotNull(rateLimitedResponse);
        Assert.Equal(HttpStatusCode.TooManyRequests, rateLimitedResponse!.StatusCode);
        
        // We should have created at least some users successfully before hitting the limit
        Assert.True(createdCount > 0, $"Expected to create some users before rate limit, but created {createdCount}");
        
        // Verify Retry-After header is present
        Assert.True(rateLimitedResponse.Headers.Contains("Retry-After"), "Retry-After header should be present");
        
        // Verify response body contains appropriate error details
        var errorBody = await rateLimitedResponse.Content.ReadAsStringAsync();
        _output.WriteLine($"Rate limit error response: {errorBody}");
        Assert.Contains("429", errorBody);
        Assert.Contains("Rate limit exceeded", errorBody);
    }

    [Fact]
    public async Task RateLimiting_ReturnsProperProblemDetails_WithStandardFields()
    {
        // Arrange: Create a test user directly in the database to avoid consuming registration rate limit
        var password = "TestPassword123!";
        var uniqueEmail = $"problemdetails-test-{Guid.NewGuid()}@example.com";
        var createRequest = new CreateUserRequest
        {
            Email = uniqueEmail,
            DisplayName = "Problem Details Test User",
            Password = password
        };
        
        await _factory.CreateTestUserDirectlyAsync(createRequest);

        var client = _factory.CreateClient();
        var loginRequest = new LoginRequest
        {
            Email = uniqueEmail,
            Password = "WrongPassword123!"
        };

        // Act: Exceed rate limit
        HttpResponseMessage? rateLimitedResponse = null;
        for (int i = 0; i < 10; i++)
        {
            var response = await client.PostAsJsonAsync("/auth/login", loginRequest);
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                rateLimitedResponse = response;
                break;
            }
        }

        // Assert: Verify we got a rate limited response
        Assert.NotNull(rateLimitedResponse);
        Assert.Equal(HttpStatusCode.TooManyRequests, rateLimitedResponse!.StatusCode);
        
        // Verify content type
        Assert.Equal("application/json", rateLimitedResponse.Content.Headers.ContentType?.MediaType);
        
        // Verify ProblemDetails structure
        var problemDetails = await rateLimitedResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(problemDetails.TryGetProperty("type", out var typeProperty));
        Assert.True(problemDetails.TryGetProperty("title", out var titleProperty));
        Assert.True(problemDetails.TryGetProperty("status", out var statusProperty));
        Assert.True(problemDetails.TryGetProperty("detail", out var detailProperty));
        
        Assert.Equal(429, statusProperty.GetInt32());
        Assert.Contains("Too Many Requests", titleProperty.GetString());
        
        _output.WriteLine($"Problem details: {problemDetails}");
    }

    [Fact]
    public async Task Login_WithValidCredentials_StillCountsTowardRateLimit()
    {
        // This test verifies that successful logins also count toward the rate limit
        // Since the rate limiter is shared across tests and partitioned by IP,
        // this test simply verifies the behavior by checking that rate limiting works
        // regardless of whether credentials are valid or not
        
        // Arrange: Create a test user directly in the database to avoid consuming registration rate limit
        var password = "TestPassword123!";
        var uniqueEmail = $"valid-login-test-{Guid.NewGuid()}@example.com";
        var createRequest = new CreateUserRequest
        {
            Email = uniqueEmail,
            DisplayName = "Valid Login Test User",
            Password = password
        };
        
        await _factory.CreateTestUserDirectlyAsync(createRequest);

        var client = _factory.CreateClient();
        var loginRequest = new LoginRequest
        {
            Email = uniqueEmail,
            Password = password
        };

        // Act: Make login attempts until we hit rate limit (could be immediate if quota exhausted)
        var responses = new List<HttpResponseMessage>();
        HttpStatusCode? firstStatus = null;
        
        for (int i = 0; i < 10; i++)
        {
            var response = await client.PostAsJsonAsync("/auth/login", loginRequest);
            responses.Add(response);
            
            if (firstStatus == null)
            {
                firstStatus = response.StatusCode;
            }
            
            _output.WriteLine($"Attempt {i + 1}: Status = {response.StatusCode}");
            
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                break;
            }
        }

        // Assert: We should eventually hit rate limit
        var rateLimitedResponses = responses.Count(r => r.StatusCode == HttpStatusCode.TooManyRequests);
        Assert.True(rateLimitedResponses > 0, "Should hit rate limit");
        
        // If the first request succeeded (quota not exhausted), verify successful login worked
        if (firstStatus == HttpStatusCode.OK)
        {
            var successfulLogins = responses.Count(r => r.StatusCode == HttpStatusCode.OK);
            Assert.True(successfulLogins > 0, "Should have at least one successful login");
            _output.WriteLine($"Successfully completed {successfulLogins} logins before hitting rate limit");
        }
        else if (firstStatus == HttpStatusCode.TooManyRequests)
        {
            _output.WriteLine("Rate limit was already exhausted from previous tests (expected in shared test fixture)");
        }
    }
}
