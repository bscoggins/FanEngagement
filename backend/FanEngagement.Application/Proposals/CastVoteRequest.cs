namespace FanEngagement.Application.Proposals;

public class CastVoteRequest
{
    public Guid ProposalOptionId { get; set; }
    public Guid UserId { get; set; }
}
