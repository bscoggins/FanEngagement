namespace FanEngagement.Domain.Entities;

public class ShareIssuance
{
    public Guid Id { get; set; }
    public Guid ShareTypeId { get; set; }
    public Guid UserId { get; set; }
    public decimal Quantity { get; set; }
    public DateTimeOffset IssuedAt { get; set; }

    public ShareType? ShareType { get; set; }
    public User? User { get; set; }
}
