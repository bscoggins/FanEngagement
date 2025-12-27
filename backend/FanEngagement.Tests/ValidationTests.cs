using System.Net;
using System.Net.Http.Json;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Proposals;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Application.WebhookEndpoints;
using Microsoft.AspNetCore.Mvc;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

public class ValidationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public ValidationTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateUser_ReturnsBadRequest_WhenEmailInvalid()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Email = "invalid-email",
            DisplayName = "Test User",
            Password = "TestPassword123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problemDetails);
        _output.WriteLine($"Problem Details: {System.Text.Json.JsonSerializer.Serialize(problemDetails)}");
    }

    [Theory]
    [MemberData(nameof(InvalidPasswords))]
    public async Task CreateUser_ReturnsBadRequest_WhenPasswordInvalid(string password, string reason)
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Email = "test@example.com",
            DisplayName = "Test User",
            Password = password
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problemDetails);
        _output.WriteLine($"Reason: {reason}; Problem Details: {System.Text.Json.JsonSerializer.Serialize(problemDetails)}");
    }

    public static IEnumerable<object[]> InvalidPasswords => new[]
    {
        new object[] { "short", "Too short" },
        new object[] { "testpassword123!", "Missing uppercase" },
        new object[] { "TestPassword!", "Missing number" },
        new object[] { "TestPassword123", "Missing special character" },
        new object[] { new string('A', 101) + "1!", "Exceeds maximum length" }
    };

    [Fact]
    public async Task CreateUser_ReturnsBadRequest_WhenDisplayNameMissing()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Email = "test@example.com",
            DisplayName = "",
            Password = "TestPassword123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateUser_ReturnsBadRequest_WhenEmailMissing()
    {
        // Arrange
        var request = new CreateUserRequest
        {
            Email = "",
            DisplayName = "Test User",
            Password = "TestPassword123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/users", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateOrganization_ReturnsBadRequest_WhenNameMissing()
    {
        // Arrange - need admin token
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = "",
            Description = "Test description"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/organizations", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problemDetails);
        _output.WriteLine($"Problem Details: {System.Text.Json.JsonSerializer.Serialize(problemDetails)}");
    }

    [Fact]
    public async Task CreateOrganization_ReturnsBadRequest_WhenNameTooLong()
    {
        // Arrange - need admin token
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = new string('A', 201), // 201 characters, exceeds max of 200
            Description = "Test description"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/organizations", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateProposal_ReturnsBadRequest_WhenTitleMissing()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization first
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        var request = new CreateProposalRequest
        {
            Title = "", // Empty title
            Description = "Test",
            StartAt = DateTimeOffset.UtcNow,
            EndAt = DateTimeOffset.UtcNow.AddDays(7),
            QuorumRequirement = 50,
            CreatedByUserId = adminUserId
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/proposals", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problemDetails);
        _output.WriteLine($"Problem Details: {System.Text.Json.JsonSerializer.Serialize(problemDetails)}");
    }

    [Fact]
    public async Task CreateProposal_ReturnsBadRequest_WhenEndBeforeStart()
    {
        // Arrange
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization first
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        var request = new CreateProposalRequest
        {
            Title = "Test Proposal",
            Description = "Test",
            StartAt = DateTimeOffset.UtcNow.AddDays(7),
            EndAt = DateTimeOffset.UtcNow, // End before start
            QuorumRequirement = 50,
            CreatedByUserId = adminUserId
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/proposals", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateShareType_ReturnsBadRequest_WhenNameMissing()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization first
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        var request = new CreateShareTypeRequest
        {
            Name = "",
            Symbol = "TEST",
            VotingWeight = 1.0m,
            IsTransferable = true
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/share-types", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateShareType_ReturnsBadRequest_WhenVotingWeightNegative()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization first
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        var request = new CreateShareTypeRequest
        {
            Name = "Test Share",
            Symbol = "TEST",
            VotingWeight = -1.0m, // Negative
            IsTransferable = true
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/share-types", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateShareIssuance_ReturnsBadRequest_WhenQuantityZero()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization first
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        var request = new CreateShareIssuanceRequest
        {
            UserId = Guid.NewGuid(),
            ShareTypeId = Guid.NewGuid(),
            Quantity = 0, // Invalid
            Reason = "Test"
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/share-issuances", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateWebhookEndpoint_ReturnsBadRequest_WhenUrlInvalid()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization first
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        var request = new CreateWebhookEndpointRequest(
            "not-a-valid-url",
            "secret-key-that-is-long-enough",
            new List<string> { "ProposalCreated" }
        );

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/webhooks", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateWebhookEndpoint_ReturnsBadRequest_WhenSecretTooShort()
    {
        // Arrange
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization first
        var orgResponse = await _client.PostAsJsonAsync("/organizations", new CreateOrganizationRequest
        {
            Name = "Test Org",
            Description = "Test"
        });
        var org = await orgResponse.Content.ReadFromJsonAsync<FanEngagement.Domain.Entities.Organization>();

        var request = new CreateWebhookEndpointRequest(
            "https://example.com/webhook",
            "short", // Too short
            new List<string> { "ProposalCreated" }
        );

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org!.Id}/webhooks", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
