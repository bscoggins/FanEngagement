using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.OutboundEvents;

public interface IOutboundEventService
{
    Task<Guid> EnqueueEventAsync(
        Guid organizationId, 
        string eventType, 
        string payloadJson, 
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OutboundEventDto>> GetAllAsync(
        Guid organizationId, 
        OutboundEventStatus? status = null, 
        string? eventType = null,
        DateTimeOffset? fromDate = null,
        DateTimeOffset? toDate = null,
        CancellationToken cancellationToken = default);

    Task<OutboundEventDetailsDto?> GetByIdAsync(
        Guid organizationId, 
        Guid eventId, 
        CancellationToken cancellationToken = default);

    Task<bool> RetryAsync(
        Guid organizationId, 
        Guid eventId,
        Guid actorUserId,
        string actorDisplayName,
        CancellationToken cancellationToken = default);
}
