using FanEngagement.Api.Helpers;
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
            ActionTypes = EnumParsingHelper.ParseEnumList<AuditActionType>(actionType),
            ResourceTypes = EnumParsingHelper.ParseEnumList<AuditResourceType>(resourceType),
            ResourceId = resourceId,
            ActorUserId = actorUserId,
            FromDate = dateFrom.HasValue ? new DateTimeOffset(dateFrom.Value, TimeSpan.Zero) : null,
            ToDate = dateTo.HasValue ? new DateTimeOffset(dateTo.Value, TimeSpan.Zero) : null,
            Outcome = EnumParsingHelper.ParseEnum<AuditOutcome>(outcome),
            Page = page,
            PageSize = Math.Min(pageSize, 100)
        };

        var result = await auditService.QueryAsync(query, cancellationToken);
        return Ok(result);
    }
}
