using FanEngagement.Domain.Enums;

namespace FanEngagement.Domain.Entities;

public class OutboundEvent
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public Guid? WebhookEndpointId { get; set; }
    public string EventType { get; set; } = default!;
    public string Payload { get; set; } = default!;
    public OutboundEventStatus Status { get; set; }
    public int AttemptCount { get; set; }
    public DateTimeOffset? LastAttemptAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Organization? Organization { get; set; }
    public WebhookEndpoint? WebhookEndpoint { get; set; }
}
