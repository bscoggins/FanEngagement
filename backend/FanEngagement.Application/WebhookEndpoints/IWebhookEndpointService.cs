namespace FanEngagement.Application.WebhookEndpoints;

public interface IWebhookEndpointService
{
    Task<WebhookEndpointDto> CreateAsync(Guid organizationId, CreateWebhookEndpointRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<WebhookEndpointDto>> GetAllAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<WebhookEndpointDto?> GetByIdAsync(Guid organizationId, Guid webhookId, CancellationToken cancellationToken = default);
    Task<WebhookEndpointDto?> UpdateAsync(Guid organizationId, Guid webhookId, UpdateWebhookEndpointRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid organizationId, Guid webhookId, CancellationToken cancellationToken = default);
}
