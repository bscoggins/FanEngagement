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
    /// <summary>
    /// Token decimals for blockchain representation.
    /// Solana SPL tokens support decimals from 0 to 9 (inclusive).
    /// If supporting other blockchains (e.g., Ethereum ERC-20 with 18 decimals), this constraint may need revision.
    /// </summary>
    [Range(0, 9)]
    public int TokenDecimals { get; set; }
}
