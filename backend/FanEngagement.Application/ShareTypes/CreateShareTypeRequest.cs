namespace FanEngagement.Application.ShareTypes;

public class CreateShareTypeRequest
{
    public string Name { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal VotingWeight { get; set; }
    public decimal? MaxSupply { get; set; }
    public bool IsTransferable { get; set; }
}
