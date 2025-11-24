namespace FanEngagement.Application.Validators;

public static class WebhookValidationHelpers
{
    /// <summary>
    /// Validates that a webhook URL is a well-formed absolute HTTP/HTTPS URL with SSRF protection.
    /// Delegates to UrlValidationHelpers.IsValidPublicHttpUrl for the actual validation.
    /// </summary>
    /// <param name="url">The webhook URL to validate</param>
    /// <returns>True if the URL is valid and safe; false otherwise. Empty URLs are invalid.</returns>
    public static bool IsValidWebhookUrl(string url)
    {
        return UrlValidationHelpers.IsValidPublicHttpUrl(url, allowEmpty: false);
    }
}
