namespace FanEngagement.Application.WebhookEndpoints;

/// <summary>
/// DTO for webhook endpoint. Does not expose the full secret for security reasons.
/// The MaskedSecret property contains a masked version of the secret (e.g., sec***123)
/// to help clients identify which secret is in use. The actual secret value is never returned.
/// </summary>
public record WebhookEndpointDto(
    Guid Id,
    Guid OrganizationId,
    string Url,
    List<string> SubscribedEvents,
    bool IsActive,
    DateTimeOffset CreatedAt,
    /// <summary>
    /// Masked version of the webhook secret (e.g., sec***123). Never contains the full secret.
    /// May be null if secret is not available or not set.
    /// </summary>
    string? MaskedSecret = null
);
