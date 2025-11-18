namespace FanEngagement.Application.Proposals;

public class CreateProposalRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTimeOffset? StartAt { get; set; }
    public DateTimeOffset? EndAt { get; set; }
    public decimal? QuorumRequirement { get; set; }
    public Guid CreatedByUserId { get; set; }
}
