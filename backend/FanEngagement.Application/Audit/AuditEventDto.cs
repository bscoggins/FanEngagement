using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Audit;

/// <summary>
/// Audit event DTO for query results.
/// </summary>
public record AuditEventDto(
    Guid Id,
    DateTimeOffset Timestamp,
    Guid? ActorUserId,
    string? ActorDisplayName,
    string? ActorIpAddress,
    AuditActionType ActionType,
    AuditOutcome Outcome,
    string? FailureReason,
    AuditResourceType ResourceType,
    Guid ResourceId,
    string? ResourceName,
    Guid? OrganizationId,
    string? OrganizationName,
    string? CorrelationId
);

/// <summary>
/// Detailed audit event DTO including the Details JSON.
/// </summary>
public record AuditEventDetailsDto(
    Guid Id,
    DateTimeOffset Timestamp,
    Guid? ActorUserId,
    string? ActorDisplayName,
    string? ActorIpAddress,
    AuditActionType ActionType,
    AuditOutcome Outcome,
    string? FailureReason,
    AuditResourceType ResourceType,
    Guid ResourceId,
    string? ResourceName,
    Guid? OrganizationId,
    string? OrganizationName,
    string? Details,
    string? CorrelationId
);
