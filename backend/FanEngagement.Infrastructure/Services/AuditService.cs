using System.Threading.Channels;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Common;
using FanEngagement.Domain.Entities;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.Services;

/// <summary>
/// Implementation of IAuditService that provides async (channel-based) and sync audit logging.
/// All audit failures are caught and logged but never propagate to callers.
/// </summary>
public class AuditService(
    Channel<AuditEvent> channel,
    FanEngagementDbContext dbContext,
    ILogger<AuditService> logger) : IAuditService
{
    /// <summary>
    /// Logs an audit event asynchronously by queueing to a channel.
    /// This method never throws - all failures are logged.
    /// </summary>
    public Task LogAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default)
    {
        try
        {
            // TryWrite is non-blocking; returns false if channel is full
            if (!channel.Writer.TryWrite(auditEvent))
            {
                logger.LogWarning(
                    "Audit channel full. Event dropped: {ActionType} on {ResourceType}/{ResourceId}",
                    auditEvent.ActionType, auditEvent.ResourceType, auditEvent.ResourceId);
            }
        }
        catch (Exception ex)
        {
            // Never propagate audit failures to caller
            logger.LogError(ex, "Failed to queue audit event");
        }
        return Task.CompletedTask;
    }

    /// <summary>
    /// Logs an audit event using a fluent builder asynchronously.
    /// </summary>
    public Task LogAsync(AuditEventBuilder builder, CancellationToken cancellationToken = default)
    {
        var auditEvent = builder.Build();
        return LogAsync(auditEvent, cancellationToken);
    }

    /// <summary>
    /// Logs an audit event synchronously, persisting it immediately.
    /// Use for critical events that must be atomically committed with business data.
    /// This method never throws - all failures are logged.
    /// </summary>
    public async Task LogSyncAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default)
    {
        try
        {
            dbContext.AuditEvents.Add(auditEvent);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Log but don't propagate
            logger.LogError(ex,
                "Failed to persist sync audit event: {ActionType} on {ResourceType}/{ResourceId}",
                auditEvent.ActionType, auditEvent.ResourceType, auditEvent.ResourceId);
        }
    }

    /// <summary>
    /// Queries audit events with filtering and pagination.
    /// </summary>
    public async Task<PagedResult<AuditEventDto>> QueryAsync(
        AuditQuery query,
        CancellationToken cancellationToken = default)
    {
        // Validate and constrain page size
        var pageSize = Math.Min(Math.Max(query.PageSize, 1), 100);
        var page = Math.Max(query.Page, 1);

        // Start with base query
        var queryable = dbContext.AuditEvents.AsNoTracking();

        // Apply filters
        if (query.OrganizationId.HasValue)
        {
            queryable = queryable.Where(e => e.OrganizationId == query.OrganizationId.Value);
        }

        if (query.ActorUserId.HasValue)
        {
            queryable = queryable.Where(e => e.ActorUserId == query.ActorUserId.Value);
        }

        if (query.ActionType.HasValue)
        {
            queryable = queryable.Where(e => e.ActionType == query.ActionType.Value);
        }

        if (query.ResourceType.HasValue)
        {
            queryable = queryable.Where(e => e.ResourceType == query.ResourceType.Value);
        }

        if (query.ResourceId.HasValue)
        {
            queryable = queryable.Where(e => e.ResourceId == query.ResourceId.Value);
        }

        if (query.Outcome.HasValue)
        {
            queryable = queryable.Where(e => e.Outcome == query.Outcome.Value);
        }

        if (query.FromDate.HasValue)
        {
            queryable = queryable.Where(e => e.Timestamp >= query.FromDate.Value);
        }

        if (query.ToDate.HasValue)
        {
            queryable = queryable.Where(e => e.Timestamp <= query.ToDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.SearchText))
        {
            queryable = queryable.Where(e =>
                (e.ResourceName != null && EF.Functions.Like(e.ResourceName, $"%{query.SearchText}%")) ||
                (e.ActorDisplayName != null && EF.Functions.Like(e.ActorDisplayName, $"%{query.SearchText}%")));
        }

        // Get total count before pagination
        var totalCount = await queryable.CountAsync(cancellationToken);

        // Apply sorting
        queryable = query.SortOrder.Equals("asc", StringComparison.OrdinalIgnoreCase)
            ? queryable.OrderBy(e => e.Timestamp)
            : queryable.OrderByDescending(e => e.Timestamp);

        // Apply pagination
        var items = await queryable
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new AuditEventDto(
                e.Id,
                e.Timestamp,
                e.ActorUserId,
                e.ActorDisplayName,
                e.ActorIpAddress,
                e.ActionType,
                e.Outcome,
                e.FailureReason,
                e.ResourceType,
                e.ResourceId,
                e.ResourceName,
                e.OrganizationId,
                e.OrganizationName,
                e.CorrelationId
            ))
            .ToListAsync(cancellationToken);

        return new PagedResult<AuditEventDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    /// <summary>
    /// Gets a single audit event by ID including the Details JSON.
    /// </summary>
    public async Task<AuditEventDetailsDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var auditEvent = await dbContext.AuditEvents
            .AsNoTracking()
            .Where(e => e.Id == id)
            .Select(e => new AuditEventDetailsDto(
                e.Id,
                e.Timestamp,
                e.ActorUserId,
                e.ActorDisplayName,
                e.ActorIpAddress,
                e.ActionType,
                e.Outcome,
                e.FailureReason,
                e.ResourceType,
                e.ResourceId,
                e.ResourceName,
                e.OrganizationId,
                e.OrganizationName,
                e.Details,
                e.CorrelationId
            ))
            .FirstOrDefaultAsync(cancellationToken);

        return auditEvent;
    }
}
