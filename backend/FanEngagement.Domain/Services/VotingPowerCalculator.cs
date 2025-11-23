using FanEngagement.Domain.Entities;

namespace FanEngagement.Domain.Services;

/// <summary>
/// Domain service for calculating voting power from share balances.
/// This service contains pure business logic with no infrastructure dependencies.
/// </summary>
public class VotingPowerCalculator
{
    /// <summary>
    /// Calculates the total voting power for a user based on their share balances.
    /// Voting power = Sum(Balance * VotingWeight) across all share types.
    /// </summary>
    /// <param name="shareBalances">The user's share balances with loaded ShareType navigation properties</param>
    /// <returns>Total voting power</returns>
    public decimal CalculateVotingPower(IEnumerable<ShareBalance> shareBalances)
    {
        return shareBalances.Sum(b => b.Balance * (b.ShareType?.VotingWeight ?? 0));
    }

    /// <summary>
    /// Calculates the total eligible voting power for an organization.
    /// This is the sum of voting power across all members with shares.
    /// </summary>
    /// <param name="shareBalances">All share balances in the organization with loaded ShareType navigation properties</param>
    /// <returns>Total eligible voting power</returns>
    public decimal CalculateTotalEligibleVotingPower(IEnumerable<ShareBalance> shareBalances)
    {
        return shareBalances.Sum(b => b.Balance * (b.ShareType?.VotingWeight ?? 0));
    }

    /// <summary>
    /// Determines if a user is eligible to vote based on their voting power.
    /// </summary>
    /// <param name="votingPower">The user's voting power</param>
    /// <returns>True if eligible (voting power > 0)</returns>
    public bool IsEligibleToVote(decimal votingPower)
    {
        return votingPower > 0;
    }
}
