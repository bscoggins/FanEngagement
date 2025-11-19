using FanEngagement.Application.OutboundEvents;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class OutboundEventService(FanEngagementDbContext dbContext) : IOutboundEventService
{
    public async Task<Guid> EnqueueEventAsync(
        Guid organizationId, 
        string eventType, 
        string payloadJson, 
        CancellationToken cancellationToken = default)
    {
        // Validate organization exists
        var organizationExists = await dbContext.Organizations
            .AnyAsync(o => o.Id == organizationId, cancellationToken);
        
        if (!organizationExists)
        {
            throw new InvalidOperationException($"Organization with ID {organizationId} not found.");
        }

        if (string.IsNullOrWhiteSpace(eventType))
        {
            throw new ArgumentException("Event type cannot be null or empty.", nameof(eventType));
        }

        if (string.IsNullOrWhiteSpace(payloadJson))
        {
            throw new ArgumentException("Payload cannot be null or empty.", nameof(payloadJson));
        }

        var outboundEvent = new OutboundEvent
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            WebhookEndpointId = null,
            EventType = eventType,
            Payload = payloadJson,
            Status = OutboundEventStatus.Pending,
            AttemptCount = 0,
            LastAttemptAt = null,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.OutboundEvents.Add(outboundEvent);
        await dbContext.SaveChangesAsync(cancellationToken);

        return outboundEvent.Id;
    }

    public async Task<IReadOnlyList<OutboundEventDto>> GetAllAsync(
        Guid organizationId, 
        OutboundEventStatus? status = null, 
        string? eventType = null, 
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.OutboundEvents
            .AsNoTracking()
            .Where(e => e.OrganizationId == organizationId);

        if (status.HasValue)
        {
            query = query.Where(e => e.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(eventType))
        {
            query = query.Where(e => e.EventType == eventType);
        }

        var events = await query
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(cancellationToken);

        return events.Select(MapToDto).ToList();
    }

    public async Task<OutboundEventDetailsDto?> GetByIdAsync(
        Guid organizationId, 
        Guid eventId, 
        CancellationToken cancellationToken = default)
    {
        var outboundEvent = await dbContext.OutboundEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == eventId && e.OrganizationId == organizationId, cancellationToken);

        return outboundEvent != null ? MapToDetailsDto(outboundEvent) : null;
    }

    public async Task<bool> RetryAsync(
        Guid organizationId, 
        Guid eventId, 
        CancellationToken cancellationToken = default)
    {
        var outboundEvent = await dbContext.OutboundEvents
            .FirstOrDefaultAsync(e => e.Id == eventId && e.OrganizationId == organizationId, cancellationToken);

        if (outboundEvent == null || outboundEvent.Status != OutboundEventStatus.Failed)
        {
            return false;
        }

        outboundEvent.Status = OutboundEventStatus.Pending;
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static OutboundEventDto MapToDto(OutboundEvent outboundEvent)
    {
        return new OutboundEventDto(
            outboundEvent.Id,
            outboundEvent.OrganizationId,
            outboundEvent.WebhookEndpointId,
            outboundEvent.EventType,
            outboundEvent.Status,
            outboundEvent.AttemptCount,
            outboundEvent.LastAttemptAt,
            outboundEvent.CreatedAt
        );
    }

    private static OutboundEventDetailsDto MapToDetailsDto(OutboundEvent outboundEvent)
    {
        return new OutboundEventDetailsDto(
            outboundEvent.Id,
            outboundEvent.OrganizationId,
            outboundEvent.WebhookEndpointId,
            outboundEvent.EventType,
            outboundEvent.Payload,
            outboundEvent.Status,
            outboundEvent.AttemptCount,
            outboundEvent.LastAttemptAt,
            outboundEvent.CreatedAt
        );
    }
}
