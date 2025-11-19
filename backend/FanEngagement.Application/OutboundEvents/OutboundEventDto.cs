using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.OutboundEvents;

public record OutboundEventDto(
    Guid Id,
    Guid OrganizationId,
    Guid? WebhookEndpointId,
    string EventType,
    OutboundEventStatus Status,
    int AttemptCount,
    DateTimeOffset? LastAttemptAt,
    DateTimeOffset CreatedAt
);
