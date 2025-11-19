using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.OutboundEvents;

public record OutboundEventDetailsDto(
    Guid Id,
    Guid OrganizationId,
    Guid? WebhookEndpointId,
    string EventType,
    string Payload,
    OutboundEventStatus Status,
    int AttemptCount,
    DateTimeOffset? LastAttemptAt,
    DateTimeOffset CreatedAt
);
