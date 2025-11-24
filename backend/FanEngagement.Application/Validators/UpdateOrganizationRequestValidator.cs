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
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters.")
            .When(x => x.Description != null);

        RuleFor(x => x.LogoUrl)
            .Must(UrlValidationHelpers.IsValidPublicHttpUrl)
            .WithMessage("Logo URL must be a valid public HTTP/HTTPS URL (localhost and private IPs are not allowed).")
            .MaximumLength(2048).WithMessage("Logo URL must not exceed 2048 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.LogoUrl));

        RuleFor(x => x.PrimaryColor)
            .MaximumLength(50).WithMessage("Primary color must not exceed 50 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.PrimaryColor));

        RuleFor(x => x.SecondaryColor)
            .MaximumLength(50).WithMessage("Secondary color must not exceed 50 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.SecondaryColor));
    }
}
