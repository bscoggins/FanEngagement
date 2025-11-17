namespace FanEngagement.Domain.Entities;

public class Vote
{
    public Guid Id { get; set; }
    public Guid ProposalId { get; set; }
    public Guid ProposalOptionId { get; set; }
    public Guid UserId { get; set; }
    public decimal VotingPower { get; set; }
    public DateTimeOffset CastAt { get; set; }

    public Proposal? Proposal { get; set; }
    public ProposalOption? ProposalOption { get; set; }
    public User? User { get; set; }
}
