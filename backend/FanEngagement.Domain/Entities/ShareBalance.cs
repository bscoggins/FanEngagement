namespace FanEngagement.Domain.Entities;

public class ShareBalance
{
    public Guid Id { get; set; }
    public Guid ShareTypeId { get; set; }
    public Guid UserId { get; set; }
    public decimal Balance { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ShareType? ShareType { get; set; }
    public User? User { get; set; }
}
