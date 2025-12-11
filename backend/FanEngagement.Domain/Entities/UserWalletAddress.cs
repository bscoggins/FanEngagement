using FanEngagement.Domain.Enums;

namespace FanEngagement.Domain.Entities;

public class UserWalletAddress
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public BlockchainType BlockchainType { get; set; }
    public string Address { get; set; } = default!;
    public string? Label { get; set; }
    public bool IsPrimary { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public User User { get; set; } = default!;
}
