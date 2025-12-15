namespace FanEngagement.Application.ShareIssuances;

public class ShareIssuanceDto
{
    public Guid Id { get; set; }
    public Guid ShareTypeId { get; set; }
    public string ShareTypeName { get; set; } = default!;
    public string ShareTypeSymbol { get; set; } = default!;
    public Guid UserId { get; set; }
    public string UserDisplayName { get; set; } = default!;
    public decimal Quantity { get; set; }
    public DateTimeOffset IssuedAt { get; set; }
    public Guid? IssuedByUserId { get; set; }
    public string? IssuedByUserDisplayName { get; set; }
    public string? Reason { get; set; }
    public string? BlockchainTransactionId { get; set; }
}
