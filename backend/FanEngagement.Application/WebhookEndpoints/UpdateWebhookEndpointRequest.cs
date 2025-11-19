namespace FanEngagement.Application.WebhookEndpoints;

public record UpdateWebhookEndpointRequest(
    string Url,
    string Secret,
    List<string> SubscribedEvents
);
