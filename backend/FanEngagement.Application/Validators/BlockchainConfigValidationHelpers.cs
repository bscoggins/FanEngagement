using System.Text.Json;

namespace FanEngagement.Application.Validators;

internal static class BlockchainConfigValidationHelpers
{
    public static IReadOnlyList<string> ValidatePolygonConfig(string? config)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(config))
        {
            errors.Add("Polygon blockchain requires blockchainConfig with adapterUrl, network, and apiKey.");
            return errors;
        }

        try
        {
            using var doc = JsonDocument.Parse(config);
            var root = doc.RootElement;

            if (!TryGetNonEmptyString(root, "adapterUrl", out var adapterUrl))
            {
                errors.Add("Polygon blockchain requires adapterUrl.");
            }
            else if (!Uri.TryCreate(adapterUrl, UriKind.Absolute, out var uri) ||
                     (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                errors.Add("Polygon adapterUrl must be an absolute http/https URL.");
            }

            if (!TryGetNonEmptyString(root, "network", out _))
            {
                errors.Add("Polygon blockchain requires network.");
            }

            if (!TryGetNonEmptyString(root, "apiKey", out _))
            {
                errors.Add("Polygon blockchain requires apiKey.");
            }
        }
        catch (JsonException)
        {
            errors.Add("Blockchain config must be valid JSON with adapterUrl, network, and apiKey for Polygon.");
        }

        return errors;
    }

    private static bool TryGetNonEmptyString(JsonElement root, string propertyName, out string? value)
    {
        value = null;

        if (root.TryGetProperty(propertyName, out var property) &&
            property.ValueKind == JsonValueKind.String)
        {
            var str = property.GetString();
            if (!string.IsNullOrWhiteSpace(str))
            {
                value = str;
                return true;
            }
        }

        return false;
    }
}
