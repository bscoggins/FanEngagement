using System.Text.Json;

namespace FanEngagement.Application.Validators;

internal static class BlockchainConfigValidationHelpers
{
    public static IReadOnlyList<string> ValidatePolygonConfig(string? config) =>
        ValidateConfig(config, "Polygon");

    public static IReadOnlyList<string> ValidateSolanaConfig(string? config) =>
        ValidateConfig(config, "Solana");

    private static IReadOnlyList<string> ValidateConfig(string? config, string chainName)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(config))
        {
            errors.Add($"{chainName} blockchain requires BlockchainConfig with adapterUrl, network, and apiKey.");
            return errors;
        }

        try
        {
            using var doc = JsonDocument.Parse(config);
            var root = doc.RootElement;

            if (!TryGetNonEmptyString(root, "adapterUrl", out var adapterUrl))
            {
                errors.Add($"{chainName} blockchain requires adapterUrl.");
            }
            else if (!Uri.TryCreate(adapterUrl, UriKind.Absolute, out var uri) ||
                     (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                errors.Add($"{chainName} adapterUrl must be an absolute http/https URL.");
            }

            if (!TryGetNonEmptyString(root, "network", out _))
            {
                errors.Add($"{chainName} blockchain requires network.");
            }

            if (!TryGetNonEmptyString(root, "apiKey", out _))
            {
                errors.Add($"{chainName} blockchain requires apiKey.");
            }
        }
        catch (JsonException)
        {
            errors.Add($"{chainName} blockchain config must be valid JSON with adapterUrl, network, and apiKey.");
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
