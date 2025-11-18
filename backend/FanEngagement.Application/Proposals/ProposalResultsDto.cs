namespace FanEngagement.Application.Proposals;

public class ProposalResultsDto
{
    public Guid ProposalId { get; set; }
    public List<OptionResultDto> OptionResults { get; set; } = new();
    public decimal TotalVotingPower { get; set; }
}

public class OptionResultDto
{
    public Guid OptionId { get; set; }
    public string OptionText { get; set; } = string.Empty;
    public int VoteCount { get; set; }
    public decimal TotalVotingPower { get; set; }
}
