using System.ComponentModel.DataAnnotations;

namespace FanEngagement.Application.ShareTypes;

public class UpdateShareTypeRequest
{
    [Required]
    [MinLength(1)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MinLength(1)]
    public string Symbol { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    [Range(0, double.MaxValue)]
    public decimal VotingWeight { get; set; }
    
    [Range(0, double.MaxValue)]
    public decimal? MaxSupply { get; set; }
    
    public bool IsTransferable { get; set; }
}
