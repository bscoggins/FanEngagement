namespace FanEngagement.Application.ShareIssuances;

public class ShareBalanceDto
{
    public Guid ShareTypeId { get; set; }
    public string ShareTypeName { get; set; } = string.Empty;
    public string ShareTypeSymbol { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
