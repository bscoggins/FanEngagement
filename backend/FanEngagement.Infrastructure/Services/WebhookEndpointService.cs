using System.Net;
using FanEngagement.Application.Audit;
using FanEngagement.Application.WebhookEndpoints;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.Services;

public class WebhookEndpointService(
    FanEngagementDbContext dbContext,
    IAuditService auditService,
    ILogger<WebhookEndpointService> logger) : IWebhookEndpointService
{
    public async Task<WebhookEndpointDto> CreateAsync(
        Guid organizationId, 
        CreateWebhookEndpointRequest request,
        Guid actorUserId,
        string actorDisplayName,
        CancellationToken cancellationToken = default)
    {
        // Validate organization exists
        var organizationExists = await dbContext.Organizations
            .AnyAsync(o => o.Id == organizationId, cancellationToken);
        
        if (!organizationExists)
        {
            throw new InvalidOperationException($"Organization with ID {organizationId} not found.");
        }

        // Validate URL - must be HTTP/HTTPS and not point to private networks (SSRF prevention)
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) ||
            (uri.Scheme != "http" && uri.Scheme != "https"))
        {
            throw new ArgumentException("URL must be a valid HTTP or HTTPS URL.", nameof(request.Url));
        }

        // Prevent SSRF attacks by blocking private IP ranges
        if (IsPrivateOrLocalhost(uri))
        {
            throw new ArgumentException("URL cannot point to private networks or localhost.", nameof(request.Url));
        }

        // Validate subscribed events
        if (request.SubscribedEvents == null || request.SubscribedEvents.Count == 0)
        {
            throw new ArgumentException("At least one subscribed event type is required.", nameof(request.SubscribedEvents));
        }

        // NOTE: Webhook secrets are stored in plain text in the database.
        // If the database is compromised, attackers would have access to all webhook secrets.
        // Consider implementing encryption at rest for sensitive data in production environments.
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

        // Audit after successful commit
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.Created)
                    .WithResource(AuditResourceType.WebhookEndpoint, webhookEndpoint.Id, MaskUrl(webhookEndpoint.Url))
                    .WithOrganization(organizationId)
                    .WithActor(actorUserId, actorDisplayName)
                    .WithDetails(new
                    {
                        endpointUrl = MaskUrl(webhookEndpoint.Url),
                        subscribedEvents = request.SubscribedEvents,
                        isActive = webhookEndpoint.IsActive
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail webhook operations
            logger.LogWarning(ex, "Failed to audit webhook endpoint creation for {WebhookEndpointId}", webhookEndpoint.Id);
        }

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
        Guid actorUserId,
        string actorDisplayName,
        CancellationToken cancellationToken = default)
    {
        var webhook = await dbContext.WebhookEndpoints
            .FirstOrDefaultAsync(w => w.Id == webhookId && w.OrganizationId == organizationId, cancellationToken);

        if (webhook == null)
        {
            return null;
        }

        // Capture original values for audit
        var originalUrl = webhook.Url;
        var originalSubscribedEvents = webhook.SubscribedEvents;

        // Validate URL - must be HTTP/HTTPS and not point to private networks (SSRF prevention)
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) ||
            (uri.Scheme != "http" && uri.Scheme != "https"))
        {
            throw new ArgumentException("URL must be a valid HTTP or HTTPS URL.", nameof(request.Url));
        }

        // Prevent SSRF attacks by blocking private IP ranges
        if (IsPrivateOrLocalhost(uri))
        {
            throw new ArgumentException("URL cannot point to private networks or localhost.", nameof(request.Url));
        }

        // Validate subscribed events
        if (request.SubscribedEvents == null || request.SubscribedEvents.Count == 0)
        {
            throw new ArgumentException("At least one subscribed event type is required.", nameof(request.SubscribedEvents));
        }

        // Track what changed
        var changedFields = new List<string>();
        if (webhook.Url != request.Url) changedFields.Add("Url");
        if (webhook.SubscribedEvents != string.Join(",", request.SubscribedEvents)) changedFields.Add("SubscribedEvents");
        if (webhook.Secret != request.Secret) changedFields.Add("Secret");

        webhook.Url = request.Url;
        webhook.Secret = request.Secret;
        webhook.SubscribedEvents = string.Join(",", request.SubscribedEvents);

        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful commit - only if there were actual changes
        if (changedFields.Any())
        {
            try
            {
                var originalEventsList = originalSubscribedEvents
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Where(e => !string.IsNullOrWhiteSpace(e))
                    .Select(e => e.Trim())
                    .ToList();

                await auditService.LogAsync(
                    new AuditEventBuilder()
                        .WithAction(AuditActionType.Updated)
                        .WithResource(AuditResourceType.WebhookEndpoint, webhook.Id, MaskUrl(webhook.Url))
                        .WithOrganization(organizationId)
                        .WithActor(actorUserId, actorDisplayName)
                        .WithDetails(new
                        {
                            changedFields,
                            oldUrl = MaskUrl(originalUrl),
                            newUrl = MaskUrl(webhook.Url),
                            oldSubscribedEvents = originalEventsList,
                            newSubscribedEvents = request.SubscribedEvents
                        })
                        .AsSuccess(),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                // Audit failures should not fail webhook operations
                logger.LogWarning(ex, "Failed to audit webhook endpoint update for {WebhookEndpointId}", webhook.Id);
            }
        }

        return MapToDto(webhook);
    }

    public async Task<bool> DeleteAsync(
        Guid organizationId, 
        Guid webhookId,
        Guid actorUserId,
        string actorDisplayName,
        CancellationToken cancellationToken = default)
    {
        var webhook = await dbContext.WebhookEndpoints
            .FirstOrDefaultAsync(w => w.Id == webhookId && w.OrganizationId == organizationId, cancellationToken);

        if (webhook == null)
        {
            return false;
        }

        // Capture URL before soft delete for audit
        var webhookUrl = webhook.Url;

        // Soft delete by setting IsActive to false
        webhook.IsActive = false;
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful commit
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.Deleted)
                    .WithResource(AuditResourceType.WebhookEndpoint, webhook.Id, MaskUrl(webhookUrl))
                    .WithOrganization(organizationId)
                    .WithActor(actorUserId, actorDisplayName)
                    .WithDetails(new
                    {
                        endpointUrl = MaskUrl(webhookUrl),
                        softDelete = true
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail webhook operations
            logger.LogWarning(ex, "Failed to audit webhook endpoint deletion for {WebhookEndpointId}", webhook.Id);
        }

        return true;
    }

    private static WebhookEndpointDto MapToDto(WebhookEndpoint webhook)
    {
        var subscribedEvents = webhook.SubscribedEvents
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Where(e => !string.IsNullOrWhiteSpace(e))
            .Select(e => e.Trim())
            .ToList();

        // Create a masked version of the secret for display purposes
        var maskedSecret = webhook.Secret.Length > 6
            ? $"{webhook.Secret.Substring(0, 3)}***{webhook.Secret.Substring(webhook.Secret.Length - 3)}"
            : "***";

        return new WebhookEndpointDto(
            webhook.Id,
            webhook.OrganizationId,
            webhook.Url,
            subscribedEvents,
            webhook.IsActive,
            webhook.CreatedAt,
            maskedSecret
        );
    }

    /// <summary>
    /// Masks webhook URLs to prevent full endpoint exposure in audit logs.
    /// </summary>
    private static string MaskUrl(string url)
    {
        if (string.IsNullOrEmpty(url))
        {
            return url;
        }

        const int MaxVisibleLength = 30;
        if (url.Length <= MaxVisibleLength)
        {
            return url;
        }

        return url[..MaxVisibleLength] + "...";
    }

    /// <summary>
    /// Checks if a URI points to private network ranges or localhost to prevent SSRF attacks.
    /// WARNING: This method does NOT perform DNS resolution for hostnames. A hostname that resolves
    /// to a private IP address will NOT be blocked. For production use, consider implementing
    /// DNS resolution and IP validation, or use a whitelist/blacklist approach for hostnames.
    /// </summary>
    private static bool IsPrivateOrLocalhost(Uri uri)
    {
        if (uri.IsLoopback)
        {
            return true;
        }

        if (!IPAddress.TryParse(uri.Host, out var ipAddress))
        {
            // If it's a hostname, check for localhost variations
            var host = uri.Host.ToLowerInvariant();
            if (host == "localhost" || host.EndsWith(".localhost"))
            {
                return true;
            }
            // For hostnames that aren't IP addresses, we can't easily determine
            // if they resolve to private IPs without DNS lookup, which could be slow
            // and could itself be exploited. This is a known limitation.
            return false;
        }

        // Check for private IP ranges
        var bytes = ipAddress.GetAddressBytes();
        
        // IPv4 checks
        if (bytes.Length == 4)
        {
            // 10.0.0.0/8
            if (bytes[0] == 10)
                return true;
            
            // 172.16.0.0/12
            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
                return true;
            
            // 192.168.0.0/16
            if (bytes[0] == 192 && bytes[1] == 168)
                return true;
            
            // 127.0.0.0/8 (loopback)
            if (bytes[0] == 127)
                return true;
            
            // 169.254.0.0/16 (link-local)
            if (bytes[0] == 169 && bytes[1] == 254)
                return true;
        }
        // IPv6 checks
        else if (bytes.Length == 16)
        {
            // ::1/128 (loopback)
            if (ipAddress.Equals(IPAddress.IPv6Loopback))
                return true;

            // fc00::/7 (unique local addresses)
            // First 7 bits are 1111110 (0xfc or 0xfd)
            if ((bytes[0] & 0xfe) == 0xfc)
                return true;

            // fe80::/10 (link-local)
            // First 10 bits are 1111111010 (0xfe80)
            if (bytes[0] == 0xfe && (bytes[1] & 0xc0) == 0x80)
                return true;
        }

        return false;
    }
}
