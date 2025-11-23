using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;

namespace FanEngagement.Domain.Services;

/// <summary>
/// Domain service for proposal lifecycle transitions and governance rule validation.
/// This service contains pure business logic with no infrastructure dependencies.
/// </summary>
public class ProposalGovernanceService
{
    /// <summary>
    /// Validates whether a proposal can transition from its current status to a target status.
    /// </summary>
    /// <param name="proposal">The proposal to validate</param>
    /// <param name="targetStatus">The desired target status</param>
    /// <returns>Validation result with error message if invalid</returns>
    public GovernanceValidationResult ValidateStatusTransition(Proposal proposal, ProposalStatus targetStatus)
    {
        if (proposal.Status == targetStatus)
        {
            return GovernanceValidationResult.Invalid($"Proposal is already in {targetStatus} status.");
        }

        // Define allowed transitions
        var allowedTransitions = GetAllowedTransitions(proposal.Status);
        
        if (!allowedTransitions.Contains(targetStatus))
        {
            return GovernanceValidationResult.Invalid(
                $"Cannot transition from {proposal.Status} to {targetStatus}. " +
                $"Allowed transitions: {string.Join(", ", allowedTransitions)}");
        }

        return GovernanceValidationResult.Valid();
    }

    /// <summary>
    /// Gets the allowed status transitions from the current status.
    /// </summary>
    private static List<ProposalStatus> GetAllowedTransitions(ProposalStatus currentStatus)
    {
        return currentStatus switch
        {
            ProposalStatus.Draft => [ProposalStatus.Open],
            ProposalStatus.Open => [ProposalStatus.Closed],
            ProposalStatus.Closed => [ProposalStatus.Finalized],
            ProposalStatus.Finalized => [], // No transitions allowed from Finalized
            _ => []
        };
    }

    /// <summary>
    /// Validates whether a proposal can be opened.
    /// </summary>
    public GovernanceValidationResult ValidateCanOpen(Proposal proposal)
    {
        if (proposal.Status != ProposalStatus.Draft)
        {
            return GovernanceValidationResult.Invalid($"Only Draft proposals can be opened. Current status: {proposal.Status}");
        }

        if (!proposal.Options.Any())
        {
            return GovernanceValidationResult.Invalid("Proposal must have at least one option before opening.");
        }

        if (proposal.Options.Count < 2)
        {
            return GovernanceValidationResult.Invalid("Proposal must have at least two options.");
        }

        return GovernanceValidationResult.Valid();
    }

    /// <summary>
    /// Validates whether a proposal can be closed.
    /// </summary>
    public GovernanceValidationResult ValidateCanClose(Proposal proposal)
    {
        if (proposal.Status != ProposalStatus.Open && proposal.Status != ProposalStatus.Draft)
        {
            return GovernanceValidationResult.Invalid($"Only Open or Draft proposals can be closed. Current status: {proposal.Status}");
        }

        return GovernanceValidationResult.Valid();
    }

    /// <summary>
    /// Validates whether a proposal can be finalized.
    /// </summary>
    public GovernanceValidationResult ValidateCanFinalize(Proposal proposal)
    {
        if (proposal.Status != ProposalStatus.Closed)
        {
            return GovernanceValidationResult.Invalid($"Only Closed proposals can be finalized. Current status: {proposal.Status}");
        }

        return GovernanceValidationResult.Valid();
    }

    /// <summary>
    /// Validates whether a proposal can be updated.
    /// </summary>
    public GovernanceValidationResult ValidateCanUpdate(Proposal proposal)
    {
        if (proposal.Status != ProposalStatus.Draft && proposal.Status != ProposalStatus.Open)
        {
            return GovernanceValidationResult.Invalid($"Cannot update proposal in {proposal.Status} state.");
        }

        return GovernanceValidationResult.Valid();
    }

    /// <summary>
    /// Validates whether an option can be added to a proposal.
    /// </summary>
    public GovernanceValidationResult ValidateCanAddOption(Proposal proposal)
    {
        if (proposal.Status != ProposalStatus.Draft && proposal.Status != ProposalStatus.Open)
        {
            return GovernanceValidationResult.Invalid($"Cannot add options to proposal in {proposal.Status} state.");
        }

        return GovernanceValidationResult.Valid();
    }

    /// <summary>
    /// Validates whether an option can be deleted from a proposal.
    /// </summary>
    public GovernanceValidationResult ValidateCanDeleteOption(Proposal proposal, bool optionHasVotes)
    {
        if (proposal.Status != ProposalStatus.Draft)
        {
            return GovernanceValidationResult.Invalid($"Cannot delete options from proposal in {proposal.Status} state.");
        }

        if (optionHasVotes)
        {
            return GovernanceValidationResult.Invalid("Cannot delete option that has votes.");
        }

        return GovernanceValidationResult.Valid();
    }

    /// <summary>
    /// Validates whether voting is allowed on a proposal.
    /// </summary>
    public GovernanceValidationResult ValidateCanVote(Proposal proposal, bool hasExistingVote)
    {
        if (proposal.Status != ProposalStatus.Open)
        {
            return GovernanceValidationResult.Invalid($"Cannot vote on proposal in {proposal.Status} state.");
        }

        if (hasExistingVote)
        {
            return GovernanceValidationResult.Invalid("User has already voted on this proposal.");
        }

        // Check if proposal is time-bounded and within voting period
        var now = DateTimeOffset.UtcNow;
        
        if (proposal.StartAt.HasValue && now < proposal.StartAt.Value)
        {
            return GovernanceValidationResult.Invalid("Voting has not started yet.");
        }

        if (proposal.EndAt.HasValue && now > proposal.EndAt.Value)
        {
            return GovernanceValidationResult.Invalid("Voting period has ended.");
        }

        return GovernanceValidationResult.Valid();
    }

    /// <summary>
    /// Computes the results of a proposal based on votes.
    /// </summary>
    /// <param name="proposal">The proposal with loaded Options and Votes</param>
    /// <returns>Computed results including winner, quorum status, and totals</returns>
    public ProposalResultComputation ComputeResults(Proposal proposal)
    {
        var optionResults = proposal.Options.Select(option =>
        {
            var optionVotes = proposal.Votes.Where(v => v.ProposalOptionId == option.Id).ToList();
            return new OptionResult
            {
                OptionId = option.Id,
                OptionText = option.Text,
                VoteCount = optionVotes.Count,
                TotalVotingPower = optionVotes.Sum(v => v.VotingPower)
            };
        }).OrderByDescending(r => r.TotalVotingPower).ToList();

        var totalVotingPowerCast = optionResults.Sum(r => r.TotalVotingPower);
        var winningOption = optionResults.FirstOrDefault();
        
        bool quorumMet = true;
        if (proposal.QuorumRequirement.HasValue && proposal.EligibleVotingPowerSnapshot.HasValue)
        {
            // Quorum is met if votes cast >= required percentage of eligible voting power
            var requiredVotingPower = proposal.EligibleVotingPowerSnapshot.Value * (proposal.QuorumRequirement.Value / 100m);
            quorumMet = totalVotingPowerCast >= requiredVotingPower;
        }

        return new ProposalResultComputation
        {
            OptionResults = optionResults,
            TotalVotingPowerCast = totalVotingPowerCast,
            WinningOptionId = winningOption?.OptionId,
            QuorumMet = quorumMet,
            EligibleVotingPower = proposal.EligibleVotingPowerSnapshot
        };
    }

    /// <summary>
    /// Determines whether results should be visible based on proposal status.
    /// </summary>
    /// <param name="status">The proposal status</param>
    /// <returns>True if results should be visible</returns>
    public bool AreResultsVisible(ProposalStatus status)
    {
        // Results are visible for Open proposals (real-time) and Closed/Finalized proposals
        return status == ProposalStatus.Open || status == ProposalStatus.Closed || status == ProposalStatus.Finalized;
    }
}

/// <summary>
/// Result of a governance validation check.
/// </summary>
public class GovernanceValidationResult
{
    public bool IsValid { get; init; }
    public string? ErrorMessage { get; init; }

    public static GovernanceValidationResult Valid() => new() { IsValid = true };
    public static GovernanceValidationResult Invalid(string message) => new() { IsValid = false, ErrorMessage = message };
}

/// <summary>
/// Results of proposal result computation.
/// </summary>
public class ProposalResultComputation
{
    public List<OptionResult> OptionResults { get; set; } = new();
    public decimal TotalVotingPowerCast { get; set; }
    public Guid? WinningOptionId { get; set; }
    public bool QuorumMet { get; set; }
    public decimal? EligibleVotingPower { get; set; }
}

/// <summary>
/// Result data for a single option.
/// </summary>
public class OptionResult
{
    public Guid OptionId { get; set; }
    public string OptionText { get; set; } = string.Empty;
    public int VoteCount { get; set; }
    public decimal TotalVotingPower { get; set; }
}
