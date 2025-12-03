using FanEngagement.Api.Helpers;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Common;
using FanEngagement.Application.Validators;
using FanEngagement.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

/// <summary>
/// Controller for GlobalAdmin to query audit events across all organizations.
/// </summary>
[ApiController]
[Route("admin/audit-events")]
[Authorize(Policy = "GlobalAdmin")]
public class AdminAuditEventsController(IAuditService auditService) : ControllerBase
{
    /// <summary>
    /// Query audit events across all organizations (GlobalAdmin only).
    /// </summary>
    /// <param name="organizationId">Filter by organization ID (optional)</param>
    /// <param name="actionType">Filter by action types (comma-separated)</param>
    /// <param name="resourceType">Filter by resource types (comma-separated)</param>
    /// <param name="resourceId">Filter by specific resource ID</param>
    /// <param name="actorUserId">Filter by actor user ID</param>
    /// <param name="dateFrom">Filter events from this date (ISO 8601)</param>
    /// <param name="dateTo">Filter events until this date (ISO 8601)</param>
    /// <param name="outcome">Filter by outcome</param>
    /// <param name="page">Page number (default: 1)</param>
    /// <param name="pageSize">Page size (default: 10, max: 100)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Paginated list of audit events</returns>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AuditEventDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PagedResult<AuditEventDto>>> GetAuditEvents(
        [FromQuery] Guid? organizationId,
        [FromQuery] string? actionType,
        [FromQuery] string? resourceType,
        [FromQuery] Guid? resourceId,
        [FromQuery] Guid? actorUserId,
        [FromQuery] DateTimeOffset? dateFrom,
        [FromQuery] DateTimeOffset? dateTo,
        [FromQuery] string? outcome,
        [FromQuery] int page = PaginationValidators.DefaultPage,
        [FromQuery] int pageSize = PaginationValidators.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        // Validate pagination parameters
        var validationError = PaginationHelper.ValidatePaginationParameters(page, pageSize);
        if (validationError != null)
        {
            return validationError;
        }

        // Build query
        var query = new AuditQuery
        {
            OrganizationId = organizationId,
            ActionTypes = EnumParsingHelper.ParseEnumList<AuditActionType>(actionType),
            ResourceTypes = EnumParsingHelper.ParseEnumList<AuditResourceType>(resourceType),
            ResourceId = resourceId,
            ActorUserId = actorUserId,
            FromDate = dateFrom,
            ToDate = dateTo,
            Outcome = EnumParsingHelper.ParseEnum<AuditOutcome>(outcome),
            Page = page,
            PageSize = pageSize
        };

        var result = await auditService.QueryAsync(query, cancellationToken);
        return Ok(result);
    }
}
