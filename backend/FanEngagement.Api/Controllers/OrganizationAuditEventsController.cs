using FanEngagement.Api.Helpers;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Common;
using FanEngagement.Application.Validators;
using FanEngagement.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Api.Controllers;

/// <summary>
/// Controller for querying audit events within a specific organization.
/// </summary>
[ApiController]
[Route("organizations/{organizationId:guid}/audit-events")]
[Authorize(Policy = "OrgAdmin")]
public class OrganizationAuditEventsController(IAuditService auditService, ILogger<OrganizationAuditEventsController> logger) : ControllerBase
{
    /// <summary>
    /// Query audit events for a specific organization.
    /// </summary>
    /// <param name="organizationId">Organization ID</param>
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
        Guid organizationId,
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

    /// <summary>
    /// Export audit events for a specific organization in CSV or JSON format.
    /// </summary>
    /// <param name="organizationId">Organization ID</param>
    /// <param name="format">Export format: "csv" or "json" (default: csv)</param>
    /// <param name="actionType">Filter by action types (comma-separated)</param>
    /// <param name="resourceType">Filter by resource types (comma-separated)</param>
    /// <param name="resourceId">Filter by specific resource ID</param>
    /// <param name="actorUserId">Filter by actor user ID</param>
    /// <param name="dateFrom">Filter events from this date (ISO 8601)</param>
    /// <param name="dateTo">Filter events until this date (ISO 8601)</param>
    /// <param name="outcome">Filter by outcome</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Streamed export file</returns>
    [HttpGet("export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task ExportAuditEvents(
        Guid organizationId,
        [FromQuery] string format = "csv",
        [FromQuery] string? actionType = null,
        [FromQuery] string? resourceType = null,
        [FromQuery] Guid? resourceId = null,
        [FromQuery] Guid? actorUserId = null,
        [FromQuery] DateTimeOffset? dateFrom = null,
        [FromQuery] DateTimeOffset? dateTo = null,
        [FromQuery] string? outcome = null,
        CancellationToken cancellationToken = default)
    {
        // Validate format
        format = format.ToLowerInvariant();
        if (format != "csv" && format != "json")
        {
            Response.StatusCode = StatusCodes.Status400BadRequest;
            await Response.WriteAsJsonAsync(new { error = "Invalid format. Must be 'csv' or 'json'." }, cancellationToken);
            return;
        }

        // Build query (same filters as query endpoint)
        var query = new AuditQuery
        {
            OrganizationId = organizationId,
            ActionTypes = EnumParsingHelper.ParseEnumList<AuditActionType>(actionType),
            ResourceTypes = EnumParsingHelper.ParseEnumList<AuditResourceType>(resourceType),
            ResourceId = resourceId,
            ActorUserId = actorUserId,
            FromDate = dateFrom,
            ToDate = dateTo,
            Outcome = EnumParsingHelper.ParseEnum<AuditOutcome>(outcome)
        };

        // Set response headers
        Response.ContentType = format == "csv" ? "text/csv" : "application/json";
        Response.Headers.ContentDisposition = 
            $"attachment; filename=audit-events-{DateTime.UtcNow:yyyyMMddHHmmss}.{format}";

        // Log the export action for audit trail
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        logger.LogInformation(
            "Audit export initiated by user {UserId} for organization {OrganizationId}. Format: {Format}, Filters: ActionType={ActionType}, ResourceType={ResourceType}, DateFrom={DateFrom}, DateTo={DateTo}",
            userId, organizationId, format, actionType, resourceType, dateFrom, dateTo);

        // Audit the export action itself
        if (Guid.TryParse(userId, out var actorId))
        {
            await auditService.LogSyncAsync(new AuditEventBuilder()
                .WithActor(actorId, User.Identity?.Name ?? "Unknown")
                .WithAction(AuditActionType.Exported)
                .WithResource(AuditResourceType.AuditEvent, organizationId, $"Export {format}")
                .WithOrganization(organizationId, null)
                .AsSuccess()
                .WithDetailsJson($"{{\"format\":\"{format}\",\"dateFrom\":\"{dateFrom}\",\"dateTo\":\"{dateTo}\",\"actionType\":\"{actionType}\",\"resourceType\":\"{resourceType}\"}}")
                .Build(), cancellationToken);
        }

        // Stream the export
        var isFirstBatch = true;
        var hasMoreBatches = true;

        await foreach (var batch in auditService.StreamEventsAsync(query, 100, cancellationToken))
        {
            hasMoreBatches = batch.Count == 100; // If batch is full, there might be more

            string content = format == "csv"
                ? AuditExportHelper.ToCsv(batch, isFirstBatch)
                : AuditExportHelper.ToJson(batch, isFirstBatch, !hasMoreBatches);

            await Response.Body.WriteAsync(System.Text.Encoding.UTF8.GetBytes(content), cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);

            isFirstBatch = false;

            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }
        }

        // Close JSON array if format is JSON and we have no data
        if (format == "json" && isFirstBatch)
        {
            await Response.Body.WriteAsync(System.Text.Encoding.UTF8.GetBytes("[]"), cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }
}
