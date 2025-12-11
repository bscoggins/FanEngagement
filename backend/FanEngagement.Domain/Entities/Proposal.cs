using FanEngagement.Domain.Enums;

namespace FanEngagement.Domain.Entities;

public class Proposal
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public ProposalStatus Status { get; set; }
    public DateTimeOffset? StartAt { get; set; }
    public DateTimeOffset? EndAt { get; set; }
    
    // Quorum configuration (percentage of total eligible voting power required)
    public decimal? QuorumRequirement { get; set; }
    
    // Snapshot of total eligible voting power at the time proposal opened
    // Used for quorum calculation
    public decimal? EligibleVotingPowerSnapshot { get; set; }
    
    // Result metadata (populated when proposal is closed/finalized)
    public Guid? WinningOptionId { get; set; }
    public bool? QuorumMet { get; set; }
    public decimal? TotalVotesCast { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public string? BlockchainProposalAddress { get; set; }
    public string? LatestContentHash { get; set; }
    public string? LatestResultsHash { get; set; }
    
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Organization? Organization { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<ProposalOption> Options { get; set; } = new List<ProposalOption>();
    public ICollection<Vote> Votes { get; set; } = new List<Vote>();
}
