namespace FanEngagement.Application.ShareTypes;

using System.ComponentModel.DataAnnotations;

public class CreateShareTypeRequest
{
    public string Name { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal VotingWeight { get; set; }
    public decimal? MaxSupply { get; set; }
    public bool IsTransferable { get; set; }
    [Range(0, 9)]
    public int TokenDecimals { get; set; }
}
