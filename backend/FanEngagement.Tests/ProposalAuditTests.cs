using System.Net.Http.Json;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Proposals;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;

namespace FanEngagement.Tests;

/// <summary>
/// Integration tests for proposal lifecycle audit events.
/// Verifies that all proposal CRUD and lifecycle operations generate appropriate audit events.
/// </summary>
public class ProposalAuditTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly ITestOutputHelper _output;

    public ProposalAuditTests(TestWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _client = factory.CreateClient();
        _output = output;
    }

    [Fact]
    public async Task CreateProposal_GeneratesAuditEvent_WithCorrectDetails()
    {
        // Arrange
        var (userId, token) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(token);

        var org = await CreateTestOrganizationAsync();
        
        var request = new CreateProposalRequest
        {
            Title = $"Audit Test Proposal {Guid.NewGuid()}",
            Description = "Test proposal for audit",
            CreatedByUserId = userId,
            StartAt = DateTimeOffset.UtcNow.AddDays(1),
            EndAt = DateTimeOffset.UtcNow.AddDays(8),
            QuorumRequirement = 0.5m
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/organizations/{org.Id}/proposals", request);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Proposal creation should succeed");
        var proposal = await response.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(proposal);

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Proposal,
            proposal!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Created, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.Proposal, auditEvent.ResourceType);
        Assert.Equal(proposal.Id, auditEvent.ResourceId);
        Assert.Equal(proposal.Title, auditEvent.ResourceName);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(org.Id, auditEvent.OrganizationId);

        // Verify details contain proposal information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains(request.Title, details!.Details ?? string.Empty);
        Assert.Contains(request.Description, details.Details ?? string.Empty);
        Assert.Contains("startAt", details.Details ?? string.Empty);
        Assert.Contains("endAt", details.Details ?? string.Empty);
        Assert.Contains("quorumRequirement", details.Details ?? string.Empty);
    }

    [Fact]
    public async Task UpdateProposal_WithChangedFields_GeneratesAuditEvent()
    {
        // Arrange
        var (proposal, token, org) = await CreateTestProposalAsync();
        _client.AddAuthorizationHeader(token);

        var updateRequest = new UpdateProposalRequest
        {
            Title = $"Updated Title {Guid.NewGuid()}",
            Description = "Updated description"
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/proposals/{proposal.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Proposal update should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Proposal,
            proposal.Id,
            AuditActionType.Updated);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Updated, auditEvent.ActionType);
        Assert.Equal(org.Id, auditEvent.OrganizationId);

        // Verify details contain changed fields with before/after values
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains("changedFields", details!.Details ?? string.Empty);
        Assert.Contains("title", details.Details ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("description", details.Details ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("old", details.Details ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("new", details.Details ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateProposal_WithNoChanges_DoesNotGenerateAuditEvent()
    {
        // Arrange
        var (proposal, token, _) = await CreateTestProposalAsync();
        _client.AddAuthorizationHeader(token);

        var updateRequest = new UpdateProposalRequest
        {
            Title = proposal.Title,
            Description = proposal.Description
        };

        // Act
        var response = await _client.PutAsJsonAsync($"/proposals/{proposal.Id}", updateRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Proposal update should succeed");

        // Wait a bit and verify no update audit event was created
        await Task.Delay(200);

        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var query = new AuditQuery
        {
            ResourceType = AuditResourceType.Proposal,
            ResourceId = proposal.Id,
            ActionType = AuditActionType.Updated,
            Page = 1,
            PageSize = 10
        };

        var result = await auditService.QueryAsync(query);

        // Should not have any Update audit events (only Created event should exist)
        Assert.Equal(0, result.TotalCount);
    }

    [Fact]
    public async Task OpenProposal_GeneratesAuditEvent_WithTransitionDetails()
    {
        // Arrange
        var (proposal, token, org) = await CreateTestProposalWithOptionsAsync();
        _client.AddAuthorizationHeader(token);

        // Act
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Proposal open should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Proposal,
            proposal.Id,
            AuditActionType.StatusChanged,
            maxWaitSeconds: 10);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.StatusChanged, auditEvent.ActionType);
        Assert.Equal(org.Id, auditEvent.OrganizationId);

        // Verify details contain lifecycle transition information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains("fromStatus", details!.Details ?? string.Empty);
        Assert.Contains("Draft", details.Details ?? string.Empty);
        Assert.Contains("toStatus", details.Details ?? string.Empty);
        Assert.Contains("Open", details.Details ?? string.Empty);
        Assert.Contains("eligibleVotingPowerSnapshot", details.Details ?? string.Empty);
    }

    [Fact]
    public async Task CloseProposal_GeneratesAuditEvent_WithResults()
    {
        // Arrange
        var (proposal, token, org) = await CreateTestProposalWithVotesAsync();
        _client.AddAuthorizationHeader(token);

        // Act
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/close", null);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Proposal close should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        // Wait for the close event (there might be multiple status changes)
        var auditEvent = await WaitForAuditEventWithDetailsAsync(
            auditService,
            AuditResourceType.Proposal,
            proposal.Id,
            AuditActionType.StatusChanged,
            "Closed",
            maxWaitSeconds: 10);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.StatusChanged, auditEvent.ActionType);
        Assert.Equal(org.Id, auditEvent.OrganizationId);

        // Verify details contain results
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains("fromStatus", details!.Details ?? string.Empty);
        Assert.Contains("toStatus", details.Details ?? string.Empty);
        Assert.Contains("Closed", details.Details ?? string.Empty);
        Assert.Contains("winningOptionId", details.Details ?? string.Empty);
        Assert.Contains("totalVotesCast", details.Details ?? string.Empty);
        Assert.Contains("quorumMet", details.Details ?? string.Empty);
        Assert.Contains("closedAt", details.Details ?? string.Empty);
    }

    [Fact]
    public async Task FinalizeProposal_GeneratesAuditEvent()
    {
        // Arrange
        var (proposal, token, org) = await CreateClosedProposalAsync();
        _client.AddAuthorizationHeader(token);

        // Act
        var response = await _client.PostAsync($"/proposals/{proposal.Id}/finalize", null);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Proposal finalize should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventWithDetailsAsync(
            auditService,
            AuditResourceType.Proposal,
            proposal.Id,
            AuditActionType.StatusChanged,
            "Finalized",
            maxWaitSeconds: 10);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.StatusChanged, auditEvent.ActionType);
        Assert.Equal(org.Id, auditEvent.OrganizationId);

        // Verify details contain finalization information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains("fromStatus", details!.Details ?? string.Empty);
        Assert.Contains("Closed", details.Details ?? string.Empty);
        Assert.Contains("toStatus", details.Details ?? string.Empty);
        Assert.Contains("Finalized", details.Details ?? string.Empty);
        Assert.Contains("finalizedAt", details.Details ?? string.Empty);
    }

    [Fact]
    public async Task AddProposalOption_GeneratesAuditEvent()
    {
        // Arrange
        var (proposal, token, org) = await CreateTestProposalAsync();
        _client.AddAuthorizationHeader(token);

        var optionRequest = new AddProposalOptionRequest
        {
            Text = $"Option {Guid.NewGuid()}",
            Description = "Test option"
        };

        // Act
        var response = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", optionRequest);

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Add option should succeed");
        var option = await response.Content.ReadFromJsonAsync<ProposalOptionDto>();
        Assert.NotNull(option);

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.ProposalOption,
            option!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Created, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.ProposalOption, auditEvent.ResourceType);
        Assert.Equal(option.Id, auditEvent.ResourceId);
        Assert.Equal(org.Id, auditEvent.OrganizationId);

        // Verify details contain option information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains("optionId", details!.Details ?? string.Empty);
        Assert.Contains("optionText", details.Details ?? string.Empty);
        Assert.Contains(optionRequest.Text, details.Details ?? string.Empty);
    }

    [Fact]
    public async Task DeleteProposalOption_GeneratesAuditEvent()
    {
        // Arrange
        var (proposal, token, org) = await CreateTestProposalWithOptionsAsync();
        _client.AddAuthorizationHeader(token);

        // Get one of the options
        var getResponse = await _client.GetAsync($"/proposals/{proposal.Id}");
        Assert.True(getResponse.IsSuccessStatusCode, "Get should succeed");
        var responseText = await getResponse.Content.ReadAsStringAsync();
        var proposalDetails = System.Text.Json.JsonSerializer.Deserialize<ProposalDetailsDto>(responseText, JsonOptions);
        Assert.NotNull(proposalDetails);
        var optionToDelete = proposalDetails!.Options.First();

        // Act
        var response = await _client.DeleteAsync($"/proposals/{proposal.Id}/options/{optionToDelete.Id}");

        // Assert
        Assert.True(response.IsSuccessStatusCode, "Delete option should succeed");

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.ProposalOption,
            optionToDelete.Id,
            AuditActionType.Deleted);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Deleted, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.ProposalOption, auditEvent.ResourceType);
        Assert.Equal(optionToDelete.Id, auditEvent.ResourceId);
        Assert.Equal(org.Id, auditEvent.OrganizationId);

        // Verify details contain option information and reason
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains("optionId", details!.Details ?? string.Empty);
        Assert.Contains("optionText", details.Details ?? string.Empty);
        Assert.Contains("reason", details.Details ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CastVote_GeneratesAuditEvent_WithVoterAndProposalDetails()
    {
        // Arrange - Set up complete voting scenario with shares
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        // Create organization
        var orgRequest = new CreateOrganizationRequest
        {
            Name = $"Test Vote Audit Org {Guid.NewGuid()}",
            Description = "Test Organization for Vote Audit"
        };
        var orgResponse = await _client.PostAsJsonAsync("/organizations", orgRequest);
        var org = await orgResponse.Content.ReadFromJsonAsync<Organization>();

        // Create user
        var userRequest = new CreateUserRequest
        {
            Email = $"voter-{Guid.NewGuid()}@example.com",
            DisplayName = "Test Voter",
            Password = "TestPassword123!"
        };
        var userResponse = await _client.PostAsJsonAsync("/users", userRequest);
        var user = await userResponse.Content.ReadFromJsonAsync<User>();

        // Create membership
        var membershipRequest = new CreateMembershipRequest
        {
            UserId = user!.Id,
            Role = OrganizationRole.Member
        };
        await _client.PostAsJsonAsync($"/organizations/{org!.Id}/memberships", membershipRequest);

        // Create share type
        var shareTypeRequest = new CreateShareTypeRequest
        {
            Name = "Test Shares",
            Symbol = "TST",
            Description = "Test share type",
            VotingWeight = 1.0m,
            MaxSupply = null,
            IsTransferable = true
        };
        var shareTypeResponse = await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-types", shareTypeRequest);
        var shareType = await shareTypeResponse.Content.ReadFromJsonAsync<ShareType>();

        // Issue shares to user to give voting power
        var issuanceRequest = new CreateShareIssuanceRequest
        {
            UserId = user.Id,
            ShareTypeId = shareType!.Id,
            Quantity = 100.0m,
            Reason = "Initial allocation for voting test"
        };
        await _client.PostAsJsonAsync($"/organizations/{org.Id}/share-issuances", issuanceRequest);

        // Create proposal with start time in the past
        var proposalRequest = new CreateProposalRequest
        {
            Title = $"Test Vote Proposal {Guid.NewGuid()}",
            Description = "Test proposal for vote auditing",
            CreatedByUserId = user.Id,
            StartAt = DateTimeOffset.UtcNow.AddMinutes(-10),
            EndAt = DateTimeOffset.UtcNow.AddDays(7),
            QuorumRequirement = 0.5m
        };
        var createResponse = await _client.PostAsJsonAsync($"/organizations/{org.Id}/proposals", proposalRequest);
        var proposal = await createResponse.Content.ReadFromJsonAsync<ProposalDto>();

        // Add options (need at least 2)
        var optionResponse = await _client.PostAsJsonAsync($"/proposals/{proposal!.Id}/options", new AddProposalOptionRequest
        {
            Text = "Option A",
            Description = "First option"
        });
        var option = await optionResponse.Content.ReadFromJsonAsync<ProposalOptionDto>();

        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest
        {
            Text = "Option B",
            Description = "Second option"
        });

        // Open the proposal
        var openResponse = await _client.PostAsync($"/proposals/{proposal.Id}/open", null);
        Assert.True(openResponse.IsSuccessStatusCode, "Open should succeed");

        // Act - Cast a vote
        var voteRequest = new CastVoteRequest
        {
            ProposalOptionId = option!.Id,
            UserId = user.Id
        };
        
        var voteResponse = await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", voteRequest);

        // Assert
        Assert.True(voteResponse.IsSuccessStatusCode, "Vote should succeed");
        var vote = await voteResponse.Content.ReadFromJsonAsync<VoteDto>();
        Assert.NotNull(vote);

        // Wait for audit event to be persisted
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Vote,
            vote!.Id,
            AuditActionType.Created,
            maxWaitSeconds: 10);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Created, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.Vote, auditEvent.ResourceType);
        Assert.Equal(vote.Id, auditEvent.ResourceId);
        Assert.Equal(org.Id, auditEvent.OrganizationId);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(user.Id, auditEvent.ActorUserId);

        // Verify details contain vote information
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        
        // Verify voter information is captured (actor fields + details)
        Assert.Contains("voterName", details!.Details ?? string.Empty);
        Assert.Contains(user.DisplayName, details.Details ?? string.Empty);
        
        // Verify proposal context is captured
        Assert.Contains("proposalId", details.Details ?? string.Empty);
        Assert.Contains(proposal.Id.ToString(), details.Details ?? string.Empty);
        Assert.Contains("proposalTitle", details.Details ?? string.Empty);
        Assert.Contains(proposal.Title, details.Details ?? string.Empty);
        
        // Verify selected option is captured
        Assert.Contains("selectedOptionId", details.Details ?? string.Empty);
        Assert.Contains(option.Id.ToString(), details.Details ?? string.Empty);
        Assert.Contains("selectedOptionText", details.Details ?? string.Empty);
        Assert.Contains(option.Text, details.Details ?? string.Empty);
        
        // Verify voting power is captured
        Assert.Contains("votingPowerUsed", details.Details ?? string.Empty);
        
        // Verify privacy note is documented
        Assert.Contains("privacyNote", details.Details ?? string.Empty);
        Assert.Contains("transparency", details.Details ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AllProposalAuditEvents_ContainRequiredFields()
    {
        // Arrange
        var (proposal, token, org) = await CreateTestProposalWithOptionsAsync();
        _client.AddAuthorizationHeader(token);

        // Perform multiple operations to generate audit events
        await _client.PostAsync($"/proposals/{proposal.Id}/open", null);

        // Wait for the StatusChanged event to be persisted (ensures all events are ready)
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var statusChangedEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.Proposal,
            proposal.Id,
            AuditActionType.StatusChanged,
            maxWaitSeconds: 10);

        Assert.NotNull(statusChangedEvent);

        // Query all audit events for this proposal
        var query = new AuditQuery
        {
            ResourceType = AuditResourceType.Proposal,
            ResourceId = proposal.Id,
            Page = 1,
            PageSize = 50
        };

        var result = await auditService.QueryAsync(query);

        // Assert - should have at least Created and StatusChanged (Open) events
        Assert.True(result.TotalCount >= 2, $"Expected at least 2 audit events, got {result.TotalCount}");

        // Verify all events have required fields
        foreach (var evt in result.Items)
        {
            Assert.NotEqual(Guid.Empty, evt.Id);
            Assert.True(evt.Timestamp > DateTimeOffset.MinValue);
            Assert.Equal(AuditResourceType.Proposal, evt.ResourceType);
            Assert.Equal(proposal.Id, evt.ResourceId);
            Assert.Equal(org.Id, evt.OrganizationId);
            Assert.True(Enum.IsDefined(typeof(AuditOutcome), evt.Outcome));
            
            // All events should have succeeded
            Assert.Equal(AuditOutcome.Success, evt.Outcome);
        }
    }

    #region Helper Methods

    private static readonly System.Text.Json.JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    private async Task<Organization> CreateTestOrganizationAsync()
    {
        var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);

        var request = new CreateOrganizationRequest
        {
            Name = $"Test Org {Guid.NewGuid()}",
            Description = "Test organization"
        };

        var response = await _client.PostAsJsonAsync("/organizations", request);
        var organization = await response.Content.ReadFromJsonAsync<Organization>();
        Assert.NotNull(organization);

        return organization!;
    }

    private async Task<(ProposalDto Proposal, string Token, Organization Org)> CreateTestProposalAsync()
    {
        var (userId, token) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(token);

        var org = await CreateTestOrganizationAsync();

        var request = new CreateProposalRequest
        {
            Title = $"Test Proposal {Guid.NewGuid()}",
            Description = "Test proposal",
            CreatedByUserId = userId,
            StartAt = DateTimeOffset.UtcNow.AddDays(1),
            EndAt = DateTimeOffset.UtcNow.AddDays(8),
            QuorumRequirement = 0.5m
        };

        var response = await _client.PostAsJsonAsync($"/organizations/{org.Id}/proposals", request);
        var proposal = await response.Content.ReadFromJsonAsync<ProposalDto>();
        Assert.NotNull(proposal);

        return (proposal!, token, org);
    }

    private async Task<(ProposalDto Proposal, string Token, Organization Org)> CreateTestProposalWithOptionsAsync()
    {
        var (proposal, token, org) = await CreateTestProposalAsync();
        _client.AddAuthorizationHeader(token);

        // Add two options
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest
        {
            Text = "Option A",
            Description = "First option"
        });

        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/options", new AddProposalOptionRequest
        {
            Text = "Option B",
            Description = "Second option"
        });

        return (proposal, token, org);
    }

    private async Task<(ProposalDto Proposal, string Token, Organization Org)> CreateTestProposalWithVotesAsync()
    {
        var (proposal, token, org) = await CreateTestProposalWithOptionsAsync();
        _client.AddAuthorizationHeader(token);

        // Open the proposal
        var openResponse = await _client.PostAsync($"/proposals/{proposal.Id}/open", null);
        Assert.True(openResponse.IsSuccessStatusCode, "Open should succeed");

        // Get the proposal details to get option IDs
        var getResponse = await _client.GetAsync($"/proposals/{proposal.Id}");
        Assert.True(getResponse.IsSuccessStatusCode, "Get should succeed");
        var responseText = await getResponse.Content.ReadAsStringAsync();
        var proposalDetails = System.Text.Json.JsonSerializer.Deserialize<ProposalDetailsDto>(responseText, JsonOptions);
        Assert.NotNull(proposalDetails);

        // Cast a vote
        var (userId, _) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        await _client.PostAsJsonAsync($"/proposals/{proposal.Id}/votes", new CastVoteRequest
        {
            ProposalOptionId = proposalDetails!.Options.First().Id,
            UserId = userId
        });

        return (proposal, token, org);
    }

    private async Task<(ProposalDto Proposal, string Token, Organization Org)> CreateClosedProposalAsync()
    {
        var (proposal, token, org) = await CreateTestProposalWithVotesAsync();
        _client.AddAuthorizationHeader(token);

        // Close the proposal
        var closeResponse = await _client.PostAsync($"/proposals/{proposal.Id}/close", null);
        Assert.True(closeResponse.IsSuccessStatusCode, "Close should succeed");

        // Get the updated proposal
        var getResponse = await _client.GetAsync($"/proposals/{proposal.Id}");
        Assert.True(getResponse.IsSuccessStatusCode, "Get should succeed");
        var responseText = await getResponse.Content.ReadAsStringAsync();
        var updatedProposal = System.Text.Json.JsonSerializer.Deserialize<ProposalDto>(responseText, JsonOptions);
        Assert.NotNull(updatedProposal);

        return (updatedProposal!, token, org);
    }

    private static async Task<AuditEventDto?> WaitForAuditEventAsync(
        IAuditService auditService,
        AuditResourceType resourceType,
        Guid resourceId,
        AuditActionType actionType,
        int maxWaitSeconds = 5)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var maxWait = TimeSpan.FromSeconds(maxWaitSeconds);
        var pollInterval = TimeSpan.FromMilliseconds(100);

        while (stopwatch.Elapsed < maxWait)
        {
            var query = new AuditQuery
            {
                ResourceType = resourceType,
                ResourceId = resourceId,
                ActionType = actionType,
                Page = 1,
                PageSize = 10
            };

            var result = await auditService.QueryAsync(query);
            var auditEvent = result.Items.FirstOrDefault();

            if (auditEvent != null)
            {
                return auditEvent;
            }

            await Task.Delay(pollInterval);
        }

        return null;
    }

    private static async Task<AuditEventDto?> WaitForAuditEventWithDetailsAsync(
        IAuditService auditService,
        AuditResourceType resourceType,
        Guid resourceId,
        AuditActionType actionType,
        string detailsContains,
        int maxWaitSeconds = 5)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var maxWait = TimeSpan.FromSeconds(maxWaitSeconds);
        var pollInterval = TimeSpan.FromMilliseconds(100);

        while (stopwatch.Elapsed < maxWait)
        {
            var query = new AuditQuery
            {
                ResourceType = resourceType,
                ResourceId = resourceId,
                ActionType = actionType,
                Page = 1,
                PageSize = 10
            };

            var result = await auditService.QueryAsync(query);
            
            foreach (var evt in result.Items)
            {
                var details = await auditService.GetByIdAsync(evt.Id);
                if (details?.Details?.Contains(detailsContains) == true)
                {
                    return evt;
                }
            }

            await Task.Delay(pollInterval);
        }

        return null;
    }

    #endregion
}
