namespace FanEngagement.Application.ShareIssuances;

public class ShareIssuanceDto
{
    public Guid Id { get; set; }
    public Guid ShareTypeId { get; set; }
    public Guid UserId { get; set; }
    public decimal Quantity { get; set; }
    public DateTimeOffset IssuedAt { get; set; }
}
