using System.Security.Claims;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Common;
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
    /// <param name="pageSize">Page size (default: 50, max: 100)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Paginated list of privacy-filtered audit events</returns>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AuditEventUserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PagedResult<AuditEventUserDto>>> GetMyAuditEvents(
        [FromQuery] string? actionType,
        [FromQuery] string? resourceType,
        [FromQuery] Guid? resourceId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] string? outcome,
        [FromQuery] Guid? organizationId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        // Get current user ID from claims
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        // Build query
        var query = new AuditQuery
        {
            OrganizationId = organizationId,
            ActionTypes = ParseEnumList<AuditActionType>(actionType),
            ResourceTypes = ParseEnumList<AuditResourceType>(resourceType),
            ResourceId = resourceId,
            FromDate = dateFrom.HasValue ? new DateTimeOffset(dateFrom.Value, TimeSpan.Zero) : null,
            ToDate = dateTo.HasValue ? new DateTimeOffset(dateTo.Value, TimeSpan.Zero) : null,
            Outcome = ParseEnum<AuditOutcome>(outcome),
            Page = page,
            PageSize = Math.Min(pageSize, 100)
        };

        var result = await auditService.QueryUserEventsAsync(userId, query, cancellationToken);
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
