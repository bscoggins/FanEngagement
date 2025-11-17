namespace FanEngagement.Domain.Entities;

public class ProposalOption
{
    public Guid Id { get; set; }
    public Guid ProposalId { get; set; }
    public string Text { get; set; } = default!;
    public string? Description { get; set; }

    public Proposal? Proposal { get; set; }
    public ICollection<Vote> Votes { get; set; } = new List<Vote>();
}
