using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Domain.Services;
using Xunit;

namespace FanEngagement.Tests;

public class ProposalGovernanceServiceTests
{
    private readonly ProposalGovernanceService _governanceService;

    public ProposalGovernanceServiceTests()
    {
        _governanceService = new ProposalGovernanceService();
    }

    #region Status Transition Tests

    [Fact]
    public void ValidateStatusTransition_FromDraftToOpen_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Draft);

        // Act
        var result = _governanceService.ValidateStatusTransition(proposal, ProposalStatus.Open);

        // Assert
        Assert.True(result.IsValid);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public void ValidateStatusTransition_FromOpenToClosed_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);

        // Act
        var result = _governanceService.ValidateStatusTransition(proposal, ProposalStatus.Closed);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateStatusTransition_FromClosedToFinalized_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Closed);

        // Act
        var result = _governanceService.ValidateStatusTransition(proposal, ProposalStatus.Finalized);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateStatusTransition_FromDraftToClosed_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Draft);

        // Act
        var result = _governanceService.ValidateStatusTransition(proposal, ProposalStatus.Closed);

        // Assert
        Assert.False(result.IsValid);
        Assert.NotNull(result.ErrorMessage);
        Assert.Contains("Cannot transition from Draft to Closed", result.ErrorMessage);
    }

    [Fact]
    public void ValidateStatusTransition_FromFinalizedToAny_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Finalized);

        // Act
        var result = _governanceService.ValidateStatusTransition(proposal, ProposalStatus.Open);

        // Assert
        Assert.False(result.IsValid);
        Assert.NotNull(result.ErrorMessage);
    }

    [Fact]
    public void ValidateStatusTransition_ToSameStatus_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);

        // Act
        var result = _governanceService.ValidateStatusTransition(proposal, ProposalStatus.Open);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("already in Open status", result.ErrorMessage);
    }

    #endregion

    #region Open Validation Tests

    [Fact]
    public void ValidateCanOpen_WithTwoOptions_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Draft);
        proposal.Options.Add(new ProposalOption { Id = Guid.NewGuid(), Text = "Option 1" });
        proposal.Options.Add(new ProposalOption { Id = Guid.NewGuid(), Text = "Option 2" });

        // Act
        var result = _governanceService.ValidateCanOpen(proposal);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateCanOpen_WithNoOptions_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Draft);

        // Act
        var result = _governanceService.ValidateCanOpen(proposal);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("at least one option", result.ErrorMessage);
    }

    [Fact]
    public void ValidateCanOpen_WithOneOption_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Draft);
        proposal.Options.Add(new ProposalOption { Id = Guid.NewGuid(), Text = "Only Option" });

        // Act
        var result = _governanceService.ValidateCanOpen(proposal);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("at least two options", result.ErrorMessage);
    }

    [Fact]
    public void ValidateCanOpen_WhenNotDraft_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);
        proposal.Options.Add(new ProposalOption { Id = Guid.NewGuid(), Text = "Option 1" });
        proposal.Options.Add(new ProposalOption { Id = Guid.NewGuid(), Text = "Option 2" });

        // Act
        var result = _governanceService.ValidateCanOpen(proposal);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Only Draft proposals can be opened", result.ErrorMessage);
    }

    #endregion

    #region Close Validation Tests

    [Fact]
    public void ValidateCanClose_WhenOpen_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);

        // Act
        var result = _governanceService.ValidateCanClose(proposal);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateCanClose_WhenDraft_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Draft);

        // Act
        var result = _governanceService.ValidateCanClose(proposal);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateCanClose_WhenClosed_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Closed);

        // Act
        var result = _governanceService.ValidateCanClose(proposal);

        // Assert
        Assert.False(result.IsValid);
    }

    #endregion

    #region Voting Validation Tests

    [Fact]
    public void ValidateCanVote_WhenOpen_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);

        // Act
        var result = _governanceService.ValidateCanVote(proposal, hasExistingVote: false);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateCanVote_WithExistingVote_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);

        // Act
        var result = _governanceService.ValidateCanVote(proposal, hasExistingVote: true);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("already voted", result.ErrorMessage);
    }

    [Fact]
    public void ValidateCanVote_WhenClosed_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Closed);

        // Act
        var result = _governanceService.ValidateCanVote(proposal, hasExistingVote: false);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Cannot vote on proposal in Closed state", result.ErrorMessage);
    }

    [Fact]
    public void ValidateCanVote_BeforeStartTime_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);
        proposal.StartAt = DateTimeOffset.UtcNow.AddDays(1);

        // Act
        var result = _governanceService.ValidateCanVote(proposal, hasExistingVote: false);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Voting has not started yet", result.ErrorMessage);
    }

    [Fact]
    public void ValidateCanVote_AfterEndTime_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);
        proposal.EndAt = DateTimeOffset.UtcNow.AddDays(-1);

        // Act
        var result = _governanceService.ValidateCanVote(proposal, hasExistingVote: false);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Voting period has ended", result.ErrorMessage);
    }

    [Fact]
    public void ValidateCanVote_WithinTimeWindow_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);
        proposal.StartAt = DateTimeOffset.UtcNow.AddDays(-1);
        proposal.EndAt = DateTimeOffset.UtcNow.AddDays(1);

        // Act
        var result = _governanceService.ValidateCanVote(proposal, hasExistingVote: false);

        // Assert
        Assert.True(result.IsValid);
    }

    #endregion

    #region Option Management Tests

    [Fact]
    public void ValidateCanAddOption_WhenDraft_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Draft);

        // Act
        var result = _governanceService.ValidateCanAddOption(proposal);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateCanAddOption_WhenOpen_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);

        // Act
        var result = _governanceService.ValidateCanAddOption(proposal);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateCanAddOption_WhenClosed_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Closed);

        // Act
        var result = _governanceService.ValidateCanAddOption(proposal);

        // Assert
        Assert.False(result.IsValid);
    }

    [Fact]
    public void ValidateCanDeleteOption_WhenDraftAndNoVotes_IsValid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Draft);

        // Act
        var result = _governanceService.ValidateCanDeleteOption(proposal, optionHasVotes: false);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateCanDeleteOption_WhenDraftButHasVotes_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Draft);

        // Act
        var result = _governanceService.ValidateCanDeleteOption(proposal, optionHasVotes: true);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("Cannot delete option that has votes", result.ErrorMessage);
    }

    [Fact]
    public void ValidateCanDeleteOption_WhenOpen_IsInvalid()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Open);

        // Act
        var result = _governanceService.ValidateCanDeleteOption(proposal, optionHasVotes: false);

        // Assert
        Assert.False(result.IsValid);
    }

    #endregion

    #region Result Computation Tests

    [Fact]
    public void ComputeResults_WithVotes_ReturnsCorrectResults()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Closed);
        var option1 = new ProposalOption { Id = Guid.NewGuid(), Text = "Option 1" };
        var option2 = new ProposalOption { Id = Guid.NewGuid(), Text = "Option 2" };
        proposal.Options.Add(option1);
        proposal.Options.Add(option2);

        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 100m });
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 50m });
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option2.Id, VotingPower = 75m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert
        Assert.Equal(225m, results.TotalVotingPowerCast);
        Assert.Equal(option1.Id, results.WinningOptionId);
        Assert.Equal(2, results.OptionResults.Count);
        
        var option1Result = results.OptionResults.First(r => r.OptionId == option1.Id);
        Assert.Equal(150m, option1Result.TotalVotingPower);
        Assert.Equal(2, option1Result.VoteCount);
    }

    [Fact]
    public void ComputeResults_WithQuorumRequirement_CalculatesQuorumMet()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Closed);
        proposal.QuorumRequirement = 50m; // 50%
        proposal.EligibleVotingPowerSnapshot = 200m;
        
        var option1 = new ProposalOption { Id = Guid.NewGuid(), Text = "Option 1" };
        proposal.Options.Add(option1);
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 100m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert
        Assert.True(results.QuorumMet); // 100/200 = 50% meets requirement
    }

    [Fact]
    public void ComputeResults_BelowQuorumRequirement_QuorumNotMet()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Closed);
        proposal.QuorumRequirement = 60m; // 60%
        proposal.EligibleVotingPowerSnapshot = 200m;
        
        var option1 = new ProposalOption { Id = Guid.NewGuid(), Text = "Option 1" };
        proposal.Options.Add(option1);
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 100m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert
        Assert.False(results.QuorumMet); // 100/200 = 50% below 60% requirement
    }

    [Fact]
    public void ComputeResults_NoQuorumRequirement_QuorumAlwaysMet()
    {
        // Arrange
        var proposal = CreateProposal(ProposalStatus.Closed);
        proposal.QuorumRequirement = null;
        
        var option1 = new ProposalOption { Id = Guid.NewGuid(), Text = "Option 1" };
        proposal.Options.Add(option1);
        proposal.Votes.Add(new Vote { Id = Guid.NewGuid(), ProposalOptionId = option1.Id, VotingPower = 10m });

        // Act
        var results = _governanceService.ComputeResults(proposal);

        // Assert
        Assert.True(results.QuorumMet);
    }

    #endregion

    #region Result Visibility Tests

    [Fact]
    public void AreResultsVisible_WhenOpen_ReturnsTrue()
    {
        Assert.True(_governanceService.AreResultsVisible(ProposalStatus.Open));
    }

    [Fact]
    public void AreResultsVisible_WhenClosed_ReturnsTrue()
    {
        Assert.True(_governanceService.AreResultsVisible(ProposalStatus.Closed));
    }

    [Fact]
    public void AreResultsVisible_WhenFinalized_ReturnsTrue()
    {
        Assert.True(_governanceService.AreResultsVisible(ProposalStatus.Finalized));
    }

    [Fact]
    public void AreResultsVisible_WhenDraft_ReturnsFalse()
    {
        Assert.False(_governanceService.AreResultsVisible(ProposalStatus.Draft));
    }

    #endregion

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
}
