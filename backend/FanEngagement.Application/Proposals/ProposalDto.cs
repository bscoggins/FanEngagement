using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Proposals;

public class ProposalDto
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProposalStatus Status { get; set; }
    public DateTimeOffset? StartAt { get; set; }
    public DateTimeOffset? EndAt { get; set; }
    public decimal? QuorumRequirement { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? BlockchainTransactionId { get; set; }
    public string? BlockchainChainId { get; set; }
    public string? BlockchainExplorerUrl { get; set; }
    
    // Governance result fields (populated when closed/finalized)
    public Guid? WinningOptionId { get; set; }
    public bool? QuorumMet { get; set; }
    public decimal? TotalVotesCast { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public decimal? EligibleVotingPowerSnapshot { get; set; }
}
