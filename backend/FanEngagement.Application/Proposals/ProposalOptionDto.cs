namespace FanEngagement.Application.Proposals;

public class ProposalOptionDto
{
    public Guid Id { get; set; }
    public Guid ProposalId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? Description { get; set; }
}
