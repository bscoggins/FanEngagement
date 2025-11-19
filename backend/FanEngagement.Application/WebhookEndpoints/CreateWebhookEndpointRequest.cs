namespace FanEngagement.Application.WebhookEndpoints;

public record CreateWebhookEndpointRequest(
    string Url,
    string Secret,
    List<string> SubscribedEvents
);
