using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Proposals;

public class ProposalDetailsDto
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
    public List<ProposalOptionDto> Options { get; set; } = new();
}
