namespace FanEngagement.Domain.Entities;

public class ShareType
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = default!;
    public string Symbol { get; set; } = default!;
    public string? Description { get; set; }
    public decimal VotingWeight { get; set; }
    public decimal? MaxSupply { get; set; }
    public bool IsTransferable { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Organization? Organization { get; set; }
    public ICollection<ShareIssuance> Issuances { get; set; } = new List<ShareIssuance>();
    public ICollection<ShareBalance> Balances { get; set; } = new List<ShareBalance>();
}
