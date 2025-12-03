namespace FanEngagement.Domain.Enums;

public enum AuditResourceType : short
{
    // Core Entities
    User = 0,
    Organization = 1,
    Membership = 2,

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

    // Audit
    AuditEvent = 40,

    // System
    SystemConfiguration = 100
}
