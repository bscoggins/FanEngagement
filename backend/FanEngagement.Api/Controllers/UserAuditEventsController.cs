using System.Security.Claims;
using FanEngagement.Api.Helpers;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Common;
using FanEngagement.Application.Validators;
using FanEngagement.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

/// <summary>
/// Controller for users to query their own audit events.
/// </summary>
[ApiController]
[Route("users/me/audit-events")]
[Authorize]
public class UserAuditEventsController(IAuditService auditService) : ControllerBase
{
    /// <summary>
    /// Query current user's own audit events (privacy-filtered, no IP addresses).
    /// </summary>
    /// <param name="actionType">Filter by action types (comma-separated)</param>
    /// <param name="resourceType">Filter by resource types (comma-separated)</param>
    /// <param name="resourceId">Filter by specific resource ID</param>
    /// <param name="dateFrom">Filter events from this date (ISO 8601)</param>
    /// <param name="dateTo">Filter events until this date (ISO 8601)</param>
    /// <param name="outcome">Filter by outcome</param>
    /// <param name="organizationId">Filter by organization ID</param>
    /// <param name="page">Page number (default: 1)</param>
    /// <param name="pageSize">Page size (default: 10, max: 100)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Paginated list of privacy-filtered audit events</returns>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AuditEventUserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PagedResult<AuditEventUserDto>>> GetMyAuditEvents(
        [FromQuery] string? actionType,
        [FromQuery] string? resourceType,
        [FromQuery] Guid? resourceId,
        [FromQuery] DateTimeOffset? dateFrom,
        [FromQuery] DateTimeOffset? dateTo,
        [FromQuery] string? outcome,
        [FromQuery] Guid? organizationId,
        [FromQuery] int page = PaginationValidators.DefaultPage,
        [FromQuery] int pageSize = PaginationValidators.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        // Get current user ID from claims
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

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
            FromDate = dateFrom,
            ToDate = dateTo,
            Outcome = EnumParsingHelper.ParseEnum<AuditOutcome>(outcome),
            Page = page,
            PageSize = pageSize
        };

        var result = await auditService.QueryUserEventsAsync(userId, query, cancellationToken);
        return Ok(result);
    }
}
