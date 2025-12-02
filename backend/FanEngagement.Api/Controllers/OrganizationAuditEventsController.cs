using FanEngagement.Application.Audit;
using FanEngagement.Application.Common;
using FanEngagement.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

/// <summary>
/// Controller for querying audit events within a specific organization.
/// </summary>
[ApiController]
[Route("organizations/{orgId:guid}/audit-events")]
[Authorize(Policy = "OrgAdmin")]
public class OrganizationAuditEventsController(IAuditService auditService) : ControllerBase
{
    /// <summary>
    /// Query audit events for a specific organization.
    /// </summary>
    /// <param name="orgId">Organization ID</param>
    /// <param name="actionType">Filter by action types (comma-separated)</param>
    /// <param name="resourceType">Filter by resource types (comma-separated)</param>
    /// <param name="resourceId">Filter by specific resource ID</param>
    /// <param name="actorUserId">Filter by actor user ID</param>
    /// <param name="dateFrom">Filter events from this date (ISO 8601)</param>
    /// <param name="dateTo">Filter events until this date (ISO 8601)</param>
    /// <param name="outcome">Filter by outcome</param>
    /// <param name="page">Page number (default: 1)</param>
    /// <param name="pageSize">Page size (default: 50, max: 100)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Paginated list of audit events</returns>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AuditEventDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<AuditEventDto>>> GetAuditEvents(
        Guid orgId,
        [FromQuery] string? actionType,
        [FromQuery] string? resourceType,
        [FromQuery] Guid? resourceId,
        [FromQuery] Guid? actorUserId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] string? outcome,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        // Build query
        var query = new AuditQuery
        {
            OrganizationId = orgId,
            ActionTypes = ParseEnumList<AuditActionType>(actionType),
            ResourceTypes = ParseEnumList<AuditResourceType>(resourceType),
            ResourceId = resourceId,
            ActorUserId = actorUserId,
            FromDate = dateFrom.HasValue ? new DateTimeOffset(dateFrom.Value, TimeSpan.Zero) : null,
            ToDate = dateTo.HasValue ? new DateTimeOffset(dateTo.Value, TimeSpan.Zero) : null,
            Outcome = ParseEnum<AuditOutcome>(outcome),
            Page = page,
            PageSize = Math.Min(pageSize, 100)
        };

        var result = await auditService.QueryAsync(query, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Parse comma-separated enum list.
    /// </summary>
    private static List<T>? ParseEnumList<T>(string? input) where T : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(input))
            return null;

        var values = input.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => Enum.TryParse<T>(s, true, out var value) ? (T?)value : null)
            .Where(v => v.HasValue)
            .Select(v => v!.Value)
            .ToList();

        return values.Count > 0 ? values : null;
    }

    /// <summary>
    /// Parse single enum value.
    /// </summary>
    private static T? ParseEnum<T>(string? input) where T : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(input))
            return null;

        return Enum.TryParse<T>(input, true, out var value) ? value : null;
    }
}
