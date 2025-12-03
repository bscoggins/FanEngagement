using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Audit;

/// <summary>
/// Query parameters for audit event retrieval.
/// </summary>
public class AuditQuery
{
    /// <summary>
    /// Filter by organization. Required for OrgAdmin queries; optional for GlobalAdmin.
    /// </summary>
    public Guid? OrganizationId { get; set; }

    /// <summary>
    /// Filter by the user who performed the action.
    /// </summary>
    public Guid? ActorUserId { get; set; }

    /// <summary>
    /// Filter by action type (Created, Updated, Deleted, etc.).
    /// </summary>
    public AuditActionType? ActionType { get; set; }

    /// <summary>
    /// Filter by multiple action types. If specified, takes precedence over ActionType.
    /// </summary>
    public List<AuditActionType>? ActionTypes { get; set; }

    /// <summary>
    /// Filter by resource type (User, Organization, Proposal, etc.).
    /// </summary>
    public AuditResourceType? ResourceType { get; set; }

    /// <summary>
    /// Filter by multiple resource types. If specified, takes precedence over ResourceType.
    /// </summary>
    public List<AuditResourceType>? ResourceTypes { get; set; }

    /// <summary>
    /// Filter by specific resource ID.
    /// </summary>
    public Guid? ResourceId { get; set; }

    /// <summary>
    /// Filter by outcome (Success, Failure, Denied).
    /// </summary>
    public AuditOutcome? Outcome { get; set; }

    /// <summary>
    /// Filter events from this date/time (inclusive).
    /// </summary>
    public DateTimeOffset? FromDate { get; set; }

    /// <summary>
    /// Filter events until this date/time (inclusive).
    /// </summary>
    public DateTimeOffset? ToDate { get; set; }

    /// <summary>
    /// Search text for resource name or actor display name.
    /// </summary>
    public string? SearchText { get; set; }

    /// <summary>
    /// Page number (1-based).
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Page size (default 50, max 100).
    /// </summary>
    public int PageSize { get; set; } = 50;

    /// <summary>
    /// Sort order: "asc" or "desc" (default: "desc" by timestamp).
    /// </summary>
    public string SortOrder { get; set; } = "desc";
}
