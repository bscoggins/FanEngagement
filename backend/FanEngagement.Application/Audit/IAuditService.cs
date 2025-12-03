using FanEngagement.Application.Common;
using FanEngagement.Domain.Entities;

namespace FanEngagement.Application.Audit;

/// <summary>
/// Service for capturing and querying audit events.
/// Audit logging is fail-safe—failures are logged but never propagate to callers.
/// </summary>
public interface IAuditService
{
    /// <summary>
    /// Logs an audit event. This method is fire-and-forget by default.
    /// The event is queued for asynchronous persistence.
    /// </summary>
    /// <param name="auditEvent">The audit event to log.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Task that completes when the event is queued (not persisted).</returns>
    Task LogAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default);

    /// <summary>
    /// Logs an audit event using a fluent builder. This method is fire-and-forget by default.
    /// </summary>
    /// <param name="builder">The audit event builder with configured properties.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Task that completes when the event is queued (not persisted).</returns>
    Task LogAsync(AuditEventBuilder builder, CancellationToken cancellationToken = default);

    /// <summary>
    /// Logs an audit event synchronously within the current database transaction.
    /// Use this for critical audit events that must be atomically committed with business data.
    /// </summary>
    /// <param name="auditEvent">The audit event to log.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Task that completes when the event is persisted.</returns>
    Task LogSyncAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default);

    /// <summary>
    /// Queries audit events with filtering and pagination.
    /// </summary>
    /// <param name="query">Query parameters including filters and pagination.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paged result of audit events.</returns>
    Task<PagedResult<AuditEventDto>> QueryAsync(
        AuditQuery query,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a single audit event by ID.
    /// </summary>
    /// <param name="id">The audit event ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The audit event or null if not found.</returns>
    Task<AuditEventDetailsDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Queries audit events for a specific user (privacy-filtered, no IP addresses).
    /// </summary>
    /// <param name="userId">The user ID to query events for.</param>
    /// <param name="query">Query parameters including filters and pagination.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Paged result of privacy-filtered audit events.</returns>
    Task<PagedResult<AuditEventUserDto>> QueryUserEventsAsync(
        Guid userId,
        AuditQuery query,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Streams audit events in batches for export, using the same filters as QueryAsync.
    /// This is memory-efficient for large datasets.
    /// </summary>
    /// <param name="query">Query parameters including filters (pagination is ignored for streaming).</param>
    /// <param name="batchSize">Number of events to return in each batch.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Async enumerable of batches of audit events.</returns>
    IAsyncEnumerable<List<AuditEventDto>> StreamEventsAsync(
        AuditQuery query,
        int batchSize = 100,
        CancellationToken cancellationToken = default);
}
