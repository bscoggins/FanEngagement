using FanEngagement.Application.WebhookEndpoints;
using FanEngagement.Domain.Entities;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class WebhookEndpointService(FanEngagementDbContext dbContext) : IWebhookEndpointService
{
    public async Task<WebhookEndpointDto> CreateAsync(
        Guid organizationId, 
        CreateWebhookEndpointRequest request, 
        CancellationToken cancellationToken = default)
    {
        // Validate organization exists
        var organizationExists = await dbContext.Organizations
            .AnyAsync(o => o.Id == organizationId, cancellationToken);
        
        if (!organizationExists)
        {
            throw new InvalidOperationException($"Organization with ID {organizationId} not found.");
        }

        // Validate URL
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out _))
        {
            throw new ArgumentException("URL must be a valid absolute URL.", nameof(request.Url));
        }

        // Validate subscribed events
        if (request.SubscribedEvents == null || request.SubscribedEvents.Count == 0)
        {
            throw new ArgumentException("At least one subscribed event type is required.", nameof(request.SubscribedEvents));
        }

        var webhookEndpoint = new WebhookEndpoint
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            Url = request.Url,
            Secret = request.Secret,
            SubscribedEvents = string.Join(",", request.SubscribedEvents),
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.WebhookEndpoints.Add(webhookEndpoint);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(webhookEndpoint);
    }

    public async Task<IReadOnlyList<WebhookEndpointDto>> GetAllAsync(
        Guid organizationId, 
        CancellationToken cancellationToken = default)
    {
        var webhooks = await dbContext.WebhookEndpoints
            .AsNoTracking()
            .Where(w => w.OrganizationId == organizationId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync(cancellationToken);

        return webhooks.Select(MapToDto).ToList();
    }

    public async Task<WebhookEndpointDto?> GetByIdAsync(
        Guid organizationId, 
        Guid webhookId, 
        CancellationToken cancellationToken = default)
    {
        var webhook = await dbContext.WebhookEndpoints
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == webhookId && w.OrganizationId == organizationId, cancellationToken);

        return webhook != null ? MapToDto(webhook) : null;
    }

    public async Task<WebhookEndpointDto?> UpdateAsync(
        Guid organizationId, 
        Guid webhookId, 
        UpdateWebhookEndpointRequest request, 
        CancellationToken cancellationToken = default)
    {
        var webhook = await dbContext.WebhookEndpoints
            .FirstOrDefaultAsync(w => w.Id == webhookId && w.OrganizationId == organizationId, cancellationToken);

        if (webhook == null)
        {
            return null;
        }

        // Validate URL
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out _))
        {
            throw new ArgumentException("URL must be a valid absolute URL.", nameof(request.Url));
        }

        // Validate subscribed events
        if (request.SubscribedEvents == null || request.SubscribedEvents.Count == 0)
        {
            throw new ArgumentException("At least one subscribed event type is required.", nameof(request.SubscribedEvents));
        }

        webhook.Url = request.Url;
        webhook.Secret = request.Secret;
        webhook.SubscribedEvents = string.Join(",", request.SubscribedEvents);

        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(webhook);
    }

    public async Task<bool> DeleteAsync(
        Guid organizationId, 
        Guid webhookId, 
        CancellationToken cancellationToken = default)
    {
        var webhook = await dbContext.WebhookEndpoints
            .FirstOrDefaultAsync(w => w.Id == webhookId && w.OrganizationId == organizationId, cancellationToken);

        if (webhook == null)
        {
            return false;
        }

        // Soft delete by setting IsActive to false
        webhook.IsActive = false;
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static WebhookEndpointDto MapToDto(WebhookEndpoint webhook)
    {
        var subscribedEvents = webhook.SubscribedEvents
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        return new WebhookEndpointDto(
            webhook.Id,
            webhook.OrganizationId,
            webhook.Url,
            subscribedEvents,
            webhook.IsActive,
            webhook.CreatedAt
        );
    }
}
