using System.Net;

namespace FanEngagement.Application.Validators;

public static class UrlValidationHelpers
{
    /// <summary>
    /// Validates that a URL is a well-formed absolute HTTP/HTTPS URL with SSRF protection.
    /// Blocks localhost and private IP ranges to prevent Server-Side Request Forgery attacks.
    /// </summary>
    /// <param name="url">The URL to validate</param>
    /// <param name="allowEmpty">If true, null or empty URLs are considered valid. If false, they are invalid.</param>
    /// <returns>True if the URL is valid and safe; false otherwise</returns>
    public static bool IsValidPublicHttpUrl(string? url, bool allowEmpty = true)
    {
        if (string.IsNullOrWhiteSpace(url))
            return allowEmpty;

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uriResult))
            return false;
        
        if (uriResult.Scheme != Uri.UriSchemeHttp && uriResult.Scheme != Uri.UriSchemeHttps)
            return false;
        
        // Block localhost and private IP ranges (SSRF protection)
        var host = uriResult.Host;
        if (host == "localhost" || host == "127.0.0.1" || host == "::1")
            return false;
        
        // Block hostnames with common internal TLDs
        var lowerHost = host.ToLowerInvariant();
        if (lowerHost.EndsWith(".local") || lowerHost.EndsWith(".internal") || lowerHost.EndsWith(".localhost"))
            return false;
        
        // Block hostnames without a public TLD (no dot in hostname, likely internal-only)
        // Examples: "myserver", "internal", etc.
        if (!lowerHost.Contains('.'))
            return false;
        
        // Block private, link-local, CGNAT, and reserved IP ranges
        if (IPAddress.TryParse(host, out var ipAddress))
        {
            var bytes = ipAddress.GetAddressBytes();
            if (bytes.Length == 4) // IPv4
            {
                if (bytes[0] == 10 || // 10.0.0.0/8 (private)
                    (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) || // 172.16.0.0/12 (private)
                    (bytes[0] == 192 && bytes[1] == 168) || // 192.168.0.0/16 (private)
                    (bytes[0] == 169 && bytes[1] == 254) || // 169.254.0.0/16 (link-local, AWS metadata)
                    bytes[0] == 0 || // 0.0.0.0/8 (current network)
                    (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127)) // 100.64.0.0/10 (CGNAT)
                    return false;
            }
            else if (bytes.Length == 16) // IPv6
            {
                // Block IPv6 ULA (fc00::/7) and link-local (fe80::/10)
                if ((bytes[0] & 0xfe) == 0xfc) // fc00::/7
                    return false;
                if (bytes[0] == 0xfe && (bytes[1] & 0xc0) == 0x80) // fe80::/10
                    return false;
            }
        }
        
        return true;
    }
}
