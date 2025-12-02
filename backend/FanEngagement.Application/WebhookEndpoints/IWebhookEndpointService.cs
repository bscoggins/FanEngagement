namespace FanEngagement.Application.WebhookEndpoints;

public interface IWebhookEndpointService
{
    Task<WebhookEndpointDto> CreateAsync(Guid organizationId, CreateWebhookEndpointRequest request, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<WebhookEndpointDto>> GetAllAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<WebhookEndpointDto?> GetByIdAsync(Guid organizationId, Guid webhookId, CancellationToken cancellationToken = default);
    Task<WebhookEndpointDto?> UpdateAsync(Guid organizationId, Guid webhookId, UpdateWebhookEndpointRequest request, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid organizationId, Guid webhookId, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default);
}
