using Microsoft.AspNetCore.Http;

namespace FanEngagement.Api.Helpers;

/// <summary>
/// Helper for extracting client context information from HTTP requests for audit logging.
/// </summary>
public static class ClientContextHelper
{
    private const int MaxUserAgentLength = 500;

    /// <summary>
    /// Extracts the client IP address from the HttpContext.
    /// Respects X-Forwarded-For header when behind a reverse proxy.
    /// </summary>
    public static string? GetClientIpAddress(HttpContext? httpContext)
    {
        if (httpContext == null)
            return null;

        // Try to get the IP from X-Forwarded-For header (set by reverse proxy)
        var forwardedFor = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2)
            // Use the first one (original client IP)
            var ips = forwardedFor.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (ips.Length > 0)
                return ips[0];
        }

        // Fallback to RemoteIpAddress
        return httpContext.Connection.RemoteIpAddress?.ToString();
    }

    /// <summary>
    /// Extracts and truncates the User-Agent header from the HttpContext.
    /// </summary>
    public static string? GetUserAgent(HttpContext? httpContext)
    {
        if (httpContext == null)
            return null;

        var userAgent = httpContext.Request.Headers.UserAgent.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(userAgent))
            return null;

        // Truncate if too long to prevent bloating the database
        if (userAgent.Length > MaxUserAgentLength)
            return userAgent[..MaxUserAgentLength];

        return userAgent;
    }
}
