namespace FanEngagement.Domain.Enums;

public enum AuditResourceType : short
{
    // Core Entities
    User = 1,
    Organization = 2,
    Membership = 3,

    // Share Management
    ShareType = 10,
    ShareIssuance = 11,
    ShareBalance = 12,

    // Governance
    Proposal = 20,
    ProposalOption = 21,
    Vote = 22,

    // Integrations
    WebhookEndpoint = 30,
    OutboundEvent = 31,

    // System
    SystemConfiguration = 100
}
