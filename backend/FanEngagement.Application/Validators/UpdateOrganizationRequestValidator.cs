using FanEngagement.Application.Organizations;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class UpdateOrganizationRequestValidator : AbstractValidator<UpdateOrganizationRequest>
{
    public UpdateOrganizationRequestValidator()
    {
        RuleFor(x => x.Name)
            .MaximumLength(200).WithMessage("Organization name must not exceed 200 characters.")
            .When(x => !string.IsNullOrEmpty(x.Name));

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Description must not exceed 1000 characters.")
            .When(x => x.Description != null);

        RuleFor(x => x.LogoUrl)
            .Must(BeAValidUrl).WithMessage("Logo URL must be a valid absolute URL.")
            .MaximumLength(2048).WithMessage("Logo URL must not exceed 2048 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.LogoUrl));

        RuleFor(x => x.PrimaryColor)
            .MaximumLength(50).WithMessage("Primary color must not exceed 50 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.PrimaryColor));

        RuleFor(x => x.SecondaryColor)
            .MaximumLength(50).WithMessage("Secondary color must not exceed 50 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.SecondaryColor));
    }

    private bool BeAValidUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return true;

        return Uri.TryCreate(url, UriKind.Absolute, out var uriResult)
            && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
    }
}
