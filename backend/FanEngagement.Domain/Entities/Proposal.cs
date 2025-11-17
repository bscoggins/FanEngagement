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
    public decimal? QuorumRequirement { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Organization? Organization { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<ProposalOption> Options { get; set; } = new List<ProposalOption>();
    public ICollection<Vote> Votes { get; set; } = new List<Vote>();
}
