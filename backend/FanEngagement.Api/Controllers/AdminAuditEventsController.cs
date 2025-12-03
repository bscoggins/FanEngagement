using FanEngagement.Api.Helpers;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Common;
using FanEngagement.Application.Validators;
using FanEngagement.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Api.Controllers;

/// <summary>
/// Controller for GlobalAdmin to query audit events across all organizations.
/// </summary>
[ApiController]
[Route("admin/audit-events")]
[Authorize(Policy = "GlobalAdmin")]
public class AdminAuditEventsController(IAuditService auditService, ILogger<AdminAuditEventsController> logger) : ControllerBase
{
    private const int ExportBatchSize = 100;
    // Sentinel GUID for admin exports that don't have a specific organization context
    private static readonly Guid AdminExportSentinelId = Guid.Parse("00000000-0000-0000-0000-000000000001");

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

    /// <summary>
    /// Export audit events across all organizations in CSV or JSON format (GlobalAdmin only).
    /// </summary>
    /// <param name="format">Export format: "csv" or "json" (default: csv)</param>
    /// <param name="organizationId">Filter by organization ID (optional)</param>
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
    [EnableRateLimiting("AuditExportPerUser")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task ExportAuditEvents(
        [FromQuery] string format = "csv",
        [FromQuery] Guid? organizationId = null,
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
            $"attachment; filename=admin-audit-events-{DateTime.UtcNow:yyyyMMddHHmmss}.{format}";

        // Log the export action for audit trail
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        logger.LogInformation(
            "Admin audit export initiated by user {UserId}. Format: {Format}, OrganizationId: {OrganizationId}, Filters: ActionType={ActionType}, ResourceType={ResourceType}, DateFrom={DateFrom}, DateTo={DateTo}",
            userId, format, organizationId, actionType, resourceType, dateFrom, dateTo);

        // Audit the export action itself
        if (Guid.TryParse(userId, out var actorId))
        {
            // For admin export, use a pseudo resource ID (could be the first org ID or a specific sentinel value)
            var exportResourceId = organizationId ?? AdminExportSentinelId;
            await auditService.LogSyncAsync(new AuditEventBuilder()
                .WithActor(actorId, User.Identity?.Name ?? "Unknown")
                .WithAction(AuditActionType.Exported)
                .WithResource(AuditResourceType.AuditEvent, exportResourceId, $"Admin Export {format}")
                .AsSuccess()
                .WithDetailsJson($"{{\"format\":\"{format}\",\"organizationId\":\"{organizationId}\",\"dateFrom\":\"{dateFrom}\",\"dateTo\":\"{dateTo}\",\"actionType\":\"{actionType}\",\"resourceType\":\"{resourceType}\"}}")
                .Build(), cancellationToken);
        }

        // Stream the export
        var isFirstBatch = true;
        var hasMoreBatches = true;

        await foreach (var batch in auditService.StreamEventsAsync(query, ExportBatchSize, cancellationToken))
        {
            hasMoreBatches = batch.Count == ExportBatchSize; // If batch is full, there might be more

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
