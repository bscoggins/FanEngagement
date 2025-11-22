using System.Net;
using FanEngagement.Application.WebhookEndpoints;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class CreateWebhookEndpointRequestValidator : AbstractValidator<CreateWebhookEndpointRequest>
{
    public CreateWebhookEndpointRequestValidator()
    {
        RuleFor(x => x.Url)
            .NotEmpty().WithMessage("URL is required.")
            .Must(BeAValidUrl).WithMessage("URL must be a valid HTTP or HTTPS URL and cannot point to private networks or localhost.")
            .MaximumLength(2048).WithMessage("URL must not exceed 2048 characters.");

        RuleFor(x => x.Secret)
            .NotEmpty().WithMessage("Secret is required.")
            .MinimumLength(16).WithMessage("Secret must be at least 16 characters for security.")
            .MaximumLength(255).WithMessage("Secret must not exceed 255 characters.");

        RuleFor(x => x.SubscribedEvents)
            .NotEmpty().WithMessage("At least one subscribed event is required.");
    }

    private bool BeAValidUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uriResult))
            return false;
        
        if (uriResult.Scheme != Uri.UriSchemeHttp && uriResult.Scheme != Uri.UriSchemeHttps)
            return false;
        
        // Block localhost and private IP ranges (SSRF protection)
        var host = uriResult.Host;
        if (host == "localhost" || host == "127.0.0.1" || host == "::1")
            return false;
        
        // Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
        if (IPAddress.TryParse(host, out var ipAddress))
        {
            var bytes = ipAddress.GetAddressBytes();
            if (bytes.Length == 4) // IPv4
            {
                if (bytes[0] == 10 || 
                    (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) ||
                    (bytes[0] == 192 && bytes[1] == 168))
                    return false;
            }
        }
        
        return true;
    }
}
