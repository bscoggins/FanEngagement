using System.Text.Json;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Audit;

/// <summary>
/// Fluent builder for constructing audit events.
/// </summary>
public class AuditEventBuilder
{
    private readonly AuditEvent _event;
    private bool _resourceSet;

    public AuditEventBuilder()
    {
        _event = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Timestamp = DateTimeOffset.UtcNow,
            Outcome = AuditOutcome.Success
        };
    }

    /// <summary>
    /// Sets the actor (user performing the action).
    /// </summary>
    public AuditEventBuilder WithActor(Guid userId, string displayName)
    {
        _event.ActorUserId = userId == Guid.Empty ? null : userId;
        _event.ActorDisplayName = displayName;
        return this;
    }

    /// <summary>
    /// Sets the actor IP address.
    /// </summary>
    public AuditEventBuilder WithIpAddress(string? ipAddress)
    {
        _event.ActorIpAddress = ipAddress;
        return this;
    }

    /// <summary>
    /// Sets the action type.
    /// </summary>
    public AuditEventBuilder WithAction(AuditActionType actionType)
    {
        _event.ActionType = actionType;
        return this;
    }

    /// <summary>
    /// Sets the resource being acted upon.
    /// </summary>
    public AuditEventBuilder WithResource(AuditResourceType resourceType, Guid resourceId, string? resourceName = null)
    {
        _event.ResourceType = resourceType;
        _event.ResourceId = resourceId;
        _event.ResourceName = resourceName;
        _resourceSet = true;
        return this;
    }

    /// <summary>
    /// Sets the organization context.
    /// </summary>
    public AuditEventBuilder WithOrganization(Guid organizationId, string? organizationName = null)
    {
        _event.OrganizationId = organizationId;
        _event.OrganizationName = organizationName;
        return this;
    }

    /// <summary>
    /// Sets the outcome to success (default).
    /// </summary>
    public AuditEventBuilder AsSuccess()
    {
        _event.Outcome = AuditOutcome.Success;
        _event.FailureReason = null;
        return this;
    }

    /// <summary>
    /// Sets the outcome to failure with a reason.
    /// </summary>
    public AuditEventBuilder AsFailure(string reason)
    {
        _event.Outcome = AuditOutcome.Failure;
        _event.FailureReason = TruncateReason(reason);
        return this;
    }

    /// <summary>
    /// Sets the outcome to denied (authorization failure) with a reason.
    /// </summary>
    public AuditEventBuilder AsDenied(string reason)
    {
        _event.Outcome = AuditOutcome.Denied;
        _event.FailureReason = TruncateReason(reason);
        return this;
    }

    /// <summary>
    /// Sets the outcome to partial success with details.
    /// </summary>
    public AuditEventBuilder AsPartial(string details)
    {
        _event.Outcome = AuditOutcome.Partial;
        _event.FailureReason = TruncateReason(details);
        return this;
    }

    /// <summary>
    /// Sets the correlation ID for request tracing.
    /// </summary>
    public AuditEventBuilder WithCorrelationId(string correlationId)
    {
        _event.CorrelationId = correlationId;
        return this;
    }

    /// <summary>
    /// Sets additional structured details as a JSON object.
    /// </summary>
    public AuditEventBuilder WithDetails(object details)
    {
        _event.Details = JsonSerializer.Serialize(details, JsonSerializerOptions);
        return this;
    }

    /// <summary>
    /// Sets additional details as raw JSON string.
    /// </summary>
    public AuditEventBuilder WithDetailsJson(string detailsJson)
    {
        _event.Details = detailsJson;
        return this;
    }

    /// <summary>
    /// Builds the audit event.
    /// </summary>
    public AuditEvent Build()
    {
        ValidateRequiredFields();
        return _event;
    }

    private void ValidateRequiredFields()
    {
        if (!_resourceSet)
            throw new InvalidOperationException("Resource must be set using WithResource().");
        if (_event.ResourceId == Guid.Empty)
            throw new InvalidOperationException("ResourceId is required.");
    }

    private static string? TruncateReason(string? reason)
    {
        const int MaxLength = 1000;
        const string TruncationSuffix = "...[truncated]";
        if (string.IsNullOrEmpty(reason)) return reason;
        if (reason.Length <= MaxLength) return reason;
        return reason[..(MaxLength - TruncationSuffix.Length)] + TruncationSuffix;
    }

    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };
}
