using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Domain.Services;
using Xunit;

namespace FanEngagement.Tests;

/// <summary>
/// Edge case tests for ProposalGovernanceService covering:
/// - All disallowed state transitions
/// - Quorum calculation edge cases
/// - Result computation with ties and edge distributions
/// - Voting power snapshot validation
/// </summary>
public class ProposalGovernanceEdgeCaseTests
{
    private readonly ProposalGovernanceService _governanceService;

    public ProposalGovernanceEdgeCaseTests()
    {
        _governanceService = new ProposalGovernanceService();
    }

    #region Disallowed State Transitions

    [Theory]
    [InlineData(ProposalStatus.Draft, ProposalStatus.Closed)]
    [InlineData(ProposalStatus.Draft, ProposalStatus.Finalized)]
    [InlineData(ProposalStatus.Open, ProposalStatus.Draft)]
    [InlineData(ProposalStatus.Open, ProposalStatus.Finalized)]
    [InlineData(ProposalStatus.Closed, ProposalStatus.Draft)]
    [InlineData(ProposalStatus.Closed, ProposalStatus.Open)]
    [InlineData(ProposalStatus.Finalized, ProposalStatus.Draft)]
    [InlineData(ProposalStatus.Finalized, ProposalStatus.Open)]
    [InlineData(ProposalStatus.Finalized, ProposalStatus.Closed)]
    public void ValidateStatusTransition_InvalidTransitions_ReturnsInvalid(
        ProposalStatus from, ProposalStatus to)
    {
        // Arrange
        var proposal = CreateProposal(from);

        // Act
        var result = _governanceService.ValidateStatusTransition(proposal, to);

        // Assert
        Assert.False(result.IsValid);
        Assert.NotNull(result.ErrorMessage);
    }

    [Fact]
    public void ValidateStatusTransition_BackwardFromOpenToDraft_ReturnsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);

        // Act
        var result = _governanceService.ValidateStatusTransition(proposal, ProposalStatus.Draft);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Draft", result.ErrorMessage);
    }

    [Fact]
    public void ValidateStatusTransition_SkippingFromDraftToFinalized_ReturnsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Draft);

        // Act
        var result = _governanceService.ValidateStatusTransition(proposal, ProposalStatus.Finalized);

        // Assert
        Assert.False(result.IsValid);
    }

    #endregion

    #region Quorum Calculation Edge Cases

    [Fact]
    public void ComputeResults_ExactlyAtQuorumThreshold_QuorumMet()
    {
        // Arrange - 50% quorum, exactly 50% votes cast
        var proposal = CreateProposalWithOptions();
        proposal.Status = ProposalStatus.Closed;
        proposal.QuorumRequirement = 50m;
        proposal.EligibleVotingPowerSnapshot = 200m;

        var option1 = proposal.Options.First();
        // Cast exactly 100 voting power (50% of 200)
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 100m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert
        Assert.True(results.QuorumMet);
    }

    [Fact]
    public void ComputeResults_JustBelowQuorumThreshold_QuorumNotMet()
    {
        // Arrange - 50% quorum, just under 50% votes cast
        var proposal = CreateProposalWithOptions();
        proposal.Status = ProposalStatus.Closed;
        proposal.QuorumRequirement = 50m;
        proposal.EligibleVotingPowerSnapshot = 200m;

        var option1 = proposal.Options.First();
        // Cast 99.99 voting power (just under 50% of 200)
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 99.99m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert
        Assert.False(results.QuorumMet);
    }

    [Fact]
    public void ComputeResults_ZeroQuorumRequirement_QuorumAlwaysMet()
    {
        // Arrange - 0% quorum requirement
        var proposal = CreateProposalWithOptions();
        proposal.Status = ProposalStatus.Closed;
        proposal.QuorumRequirement = 0m;
        proposal.EligibleVotingPowerSnapshot = 1000m;

        var option1 = proposal.Options.First();
        // Just 1 voting power
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 1m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert
        Assert.True(results.QuorumMet);
    }

    [Fact]
    public void ComputeResults_100PercentQuorumRequirement_RequiresAllVotes()
    {
        // Arrange - 100% quorum requirement
        var proposal = CreateProposalWithOptions();
        proposal.Status = ProposalStatus.Closed;
        proposal.QuorumRequirement = 100m;
        proposal.EligibleVotingPowerSnapshot = 100m;

        var option1 = proposal.Options.First();
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 99m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert
        Assert.False(results.QuorumMet);
    }

    [Fact]
    public void ComputeResults_NoEligibleVotingPowerSnapshot_QuorumNotMet()
    {
        // Arrange - no snapshot captured (legacy edge case)
        var proposal = CreateProposalWithOptions();
        proposal.Status = ProposalStatus.Closed;
        proposal.QuorumRequirement = 50m;
        proposal.EligibleVotingPowerSnapshot = null; // No snapshot

        var option1 = proposal.Options.First();
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 100m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert - should fail if no snapshot to validate against
        Assert.False(results.QuorumMet);
    }

    [Fact]
    public void ComputeResults_ZeroEligibleVotingPower_HandledGracefully()
    {
        // Arrange - edge case where org has no voting power
        var proposal = CreateProposalWithOptions();
        proposal.Status = ProposalStatus.Closed;
        proposal.QuorumRequirement = 50m;
        proposal.EligibleVotingPowerSnapshot = 0m;

        // Act - no votes cast, no eligible power
        var results = _governanceService.ComputeResults(proposal);

        // Assert - total votes cast should be 0, but there's still a "winning" option (first by ID)
        Assert.Equal(0m, results.TotalVotingPowerCast);
        Assert.NotNull(results.WinningOptionId); // First option is selected even with 0 votes
    }

    #endregion

    #region Result Computation with Ties

    [Fact]
    public void ComputeResults_TiedOptions_SelectsLowestOptionId()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Closed);
        
        var option1 = new ProposalOption { Id = Guid.Parse("00000000-0000-0000-0000-000000000001"), Text = "Option A" };
        var option2 = new ProposalOption { Id = Guid.Parse("00000000-0000-0000-0000-000000000002"), Text = "Option B" };
        proposal.Options.Add(option1);
        proposal.Options.Add(option2);

        // Equal votes for both
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 100m });
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option2.Id, VotingPower = 100m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert - deterministic tie-breaker should select option1 (lower GUID)
        Assert.Equal(option1.Id, results.WinningOptionId);
    }

    [Fact]
    public void ComputeResults_ThreeWayTie_SelectsLowestOptionId()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Closed);
        
        var option1 = new ProposalOption { Id = Guid.Parse("00000000-0000-0000-0000-000000000003"), Text = "Option C" };
        var option2 = new ProposalOption { Id = Guid.Parse("00000000-0000-0000-0000-000000000001"), Text = "Option A" };
        var option3 = new ProposalOption { Id = Guid.Parse("00000000-0000-0000-0000-000000000002"), Text = "Option B" };
        proposal.Options.Add(option1);
        proposal.Options.Add(option2);
        proposal.Options.Add(option3);

        // Equal votes for all
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 50m });
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option2.Id, VotingPower = 50m });
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option3.Id, VotingPower = 50m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert - should select option2 (lowest GUID among ties)
        Assert.Equal(option2.Id, results.WinningOptionId);
    }

    [Fact]
    public void ComputeResults_NoVotes_FirstOptionIsWinner()
    {
        // Arrange
        var proposal = CreateProposalWithOptions();
        proposal.Status = ProposalStatus.Closed;
        proposal.QuorumRequirement = null;

        // Act - no votes, but options exist
        var results = _governanceService.ComputeResults(proposal);

        // Assert - the first option (by GUID order after tied voting power) becomes "winner"
        Assert.NotNull(results.WinningOptionId); // First option selected by tie-breaker
        Assert.Equal(0m, results.TotalVotingPowerCast);
        Assert.True(results.QuorumMet); // No quorum requirement
    }

    [Fact]
    public void ComputeResults_SingleVoteForOneOption_CorrectWinner()
    {
        // Arrange
        var proposal = CreateProposalWithOptions();
        proposal.Status = ProposalStatus.Closed;

        var option2 = proposal.Options.Last();
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option2.Id, VotingPower = 1m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert
        Assert.Equal(option2.Id, results.WinningOptionId);
        Assert.Equal(1m, results.TotalVotingPowerCast);
    }

    #endregion

    #region Multiple Options Result Distribution

    [Fact]
    public void ComputeResults_MultipleVotersPerOption_AggregatesCorrectly()
    {
        // Arrange
        var proposal = CreateProposalWithOptions();
        proposal.Status = ProposalStatus.Closed;

        var option1 = proposal.Options.First();
        var option2 = proposal.Options.Last();

        // Multiple voters for each option
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 100m });
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 50m });
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 25m });
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option2.Id, VotingPower = 80m });
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option2.Id, VotingPower = 90m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert
        Assert.Equal(345m, results.TotalVotingPowerCast);
        Assert.Equal(option1.Id, results.WinningOptionId); // 175 > 170

        var option1Result = results.OptionResults.First(r => r.OptionId == option1.Id);
        Assert.Equal(175m, option1Result.TotalVotingPower);
        Assert.Equal(3, option1Result.VoteCount);

        var option2Result = results.OptionResults.First(r => r.OptionId == option2.Id);
        Assert.Equal(170m, option2Result.TotalVotingPower);
        Assert.Equal(2, option2Result.VoteCount);
    }

    [Fact]
    public void ComputeResults_DecimalVotingPower_CalculatesAccurately()
    {
        // Arrange
        var proposal = CreateProposalWithOptions();
        proposal.Status = ProposalStatus.Closed;
        proposal.QuorumRequirement = 33.33m;
        proposal.EligibleVotingPowerSnapshot = 300m;

        var option1 = proposal.Options.First();
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 100.01m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert - 100.01/300 = 33.33...% which meets 33.33% quorum
        Assert.True(results.QuorumMet);
        Assert.Equal(100.01m, results.TotalVotingPowerCast);
    }

    #endregion

    #region Voting Power Snapshot Logic

    [Fact]
    public void ValidateCanOpen_VerifiesOptionsCountBeforeOpeningSnapshot()
    {
        // Arrange - proposal with exactly 2 options (minimum)
        var proposal = CreateProposal(ProposalStatus.Draft);
        proposal.Options.Add(new ProposalOption { Id = Guid.NewGuid(), Text = "Option 1" });
        proposal.Options.Add(new ProposalOption { Id = Guid.NewGuid(), Text = "Option 2" });

        // Act
        var result = _governanceService.ValidateCanOpen(proposal);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateCanOpen_ManyOptions_IsValid()
    {
        // Arrange - proposal with many options
        var proposal = CreateProposal(ProposalStatus.Draft);
        for (int i = 0; i < 10; i++)
        {
            proposal.Options.Add(new ProposalOption { Id = Guid.NewGuid(), Text = $"Option {i + 1}" });
        }

        // Act
        var result = _governanceService.ValidateCanOpen(proposal);

        // Assert
        Assert.True(result.IsValid);
    }

    #endregion

    #region Time Window Edge Cases

    [Fact]
    public void ValidateCanVote_PastStartTime_IsValid()
    {
        // Arrange - use a clearly past time for determinism
        var now = DateTimeOffset.UtcNow;
        var proposal = CreateProposal(ProposalStatus.Open);
        proposal.StartAt = now.AddMinutes(-5); // Started 5 minutes ago
        proposal.EndAt = now.AddHours(1);

        // Act
        var result = _governanceService.ValidateCanVote(proposal, hasExistingVote: false);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateCanVote_PastEndTime_IsInvalid()
    {
        // Arrange - use a clearly past time for determinism
        var now = DateTimeOffset.UtcNow;
        var proposal = CreateProposal(ProposalStatus.Open);
        proposal.StartAt = now.AddHours(-2);
        proposal.EndAt = now.AddMinutes(-5); // Ended 5 minutes ago

        // Act
        var result = _governanceService.ValidateCanVote(proposal, hasExistingVote: false);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("ended", result.ErrorMessage);
    }

    [Fact]
    public void ValidateCanVote_NoTimeConstraints_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);
        proposal.StartAt = null;
        proposal.EndAt = null;

        // Act
        var result = _governanceService.ValidateCanVote(proposal, hasExistingVote: false);

        // Assert
        Assert.True(result.IsValid);
    }

    #endregion

    #region Helper Methods

    private static Proposal CreateProposal(ProposalStatus status)
    {
        return new Proposal
        {
            Id = Guid.NewGuid(),
            OrganizationId = Guid.NewGuid(),
            Title = "Test Proposal",
            Status = status,
            CreatedByUserId = Guid.NewGuid(),
            CreatedAt = DateTimeOffset.UtcNow,
            Options = new List<ProposalOption>(),
            Votes = new List<Vote>()
        };
    }

    private static Proposal CreateProposalWithOptions()
    {
        var proposal = CreateProposal(ProposalStatus.Draft);
        proposal.Options.Add(new ProposalOption { Id = Guid.NewGuid(), Text = "Option 1" });
        proposal.Options.Add(new ProposalOption { Id = Guid.NewGuid(), Text = "Option 2" });
        return proposal;
    }

    #endregion
}
