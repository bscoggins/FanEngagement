namespace FanEngagement.Application.Proposals;

public class VoteDto
{
    public Guid Id { get; set; }
    public Guid ProposalId { get; set; }
    public Guid ProposalOptionId { get; set; }
    public Guid UserId { get; set; }
    public decimal VotingPower { get; set; }
    public DateTimeOffset CastAt { get; set; }
    public string? BlockchainTransactionId { get; set; }
    public string? BlockchainChainId { get; set; }
    public string? BlockchainExplorerUrl { get; set; }
}
