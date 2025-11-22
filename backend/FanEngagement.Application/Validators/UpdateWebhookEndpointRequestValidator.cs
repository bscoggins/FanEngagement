using FanEngagement.Application.WebhookEndpoints;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class UpdateWebhookEndpointRequestValidator : AbstractValidator<UpdateWebhookEndpointRequest>
{
    public UpdateWebhookEndpointRequestValidator()
    {
        RuleFor(x => x.Url)
            .NotEmpty().WithMessage("URL is required.")
            .Must(WebhookValidationHelpers.IsValidWebhookUrl).WithMessage("URL must be a valid HTTP or HTTPS URL and cannot point to private networks or localhost.")
            .MaximumLength(2048).WithMessage("URL must not exceed 2048 characters.");

        RuleFor(x => x.Secret)
            .NotEmpty().WithMessage("Secret is required.")
            .MinimumLength(16).WithMessage("Secret must be at least 16 characters for security.")
            .MaximumLength(255).WithMessage("Secret must not exceed 255 characters.");

        RuleFor(x => x.SubscribedEvents)
            .NotEmpty().WithMessage("At least one subscribed event is required.");
    }
}
