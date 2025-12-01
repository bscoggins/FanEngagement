using FanEngagement.Domain.Enums;

namespace FanEngagement.Domain.Entities;

public class AuditEvent
{
    public Guid Id { get; set; }

    public DateTimeOffset Timestamp { get; set; }

    // Actor Information
    public Guid? ActorUserId { get; set; }
    public string? ActorDisplayName { get; set; }
    public string? ActorIpAddress { get; set; }

    // Action Classification
    public AuditActionType ActionType { get; set; }
    public AuditOutcome Outcome { get; set; }
    public string? FailureReason { get; set; }

    // Resource Information
    public AuditResourceType ResourceType { get; set; }
    public Guid ResourceId { get; set; }
    public string? ResourceName { get; set; }

    // Organization Context
    public Guid? OrganizationId { get; set; }
    public string? OrganizationName { get; set; }

    // Additional Context
    public string? Details { get; set; }
    public string? CorrelationId { get; set; }

    // Navigation properties
    public User? ActorUser { get; set; }
    public Organization? Organization { get; set; }
}
