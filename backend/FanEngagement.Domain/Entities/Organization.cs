using FanEngagement.Domain.Enums;

namespace FanEngagement.Domain.Entities;

public class Organization
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    // Branding fields
    public string? LogoUrl { get; set; }
    public string? PrimaryColor { get; set; }
    public string? SecondaryColor { get; set; }

    // Blockchain configuration
    public BlockchainType BlockchainType { get; set; } = BlockchainType.None;
    public string? BlockchainConfig { get; set; } // JSON string

    public ICollection<OrganizationMembership> Memberships { get; set; } = new List<OrganizationMembership>();
    public ICollection<ShareType> ShareTypes { get; set; } = new List<ShareType>();
    public ICollection<Proposal> Proposals { get; set; } = new List<Proposal>();
    public ICollection<WebhookEndpoint> WebhookEndpoints { get; set; } = new List<WebhookEndpoint>();
    public ICollection<OutboundEvent> OutboundEvents { get; set; } = new List<OutboundEvent>();
    public ICollection<AuditEvent> AuditEvents { get; set; } = new List<AuditEvent>();
}
