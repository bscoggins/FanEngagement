namespace FanEngagement.Application.WebhookEndpoints;

public record WebhookEndpointDto(
    Guid Id,
    Guid OrganizationId,
    string Url,
    List<string> SubscribedEvents,
    bool IsActive,
    DateTimeOffset CreatedAt
);
