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
    /// Validation for allowed decimals is performed in the blockchain adapter layer,
    /// as different blockchains support different ranges (e.g., Solana: 0-9, Ethereum ERC-20: up to 18).
    /// </summary>
    public int TokenDecimals { get; set; }
}
