using FanEngagement.Application.Organizations;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class UpdateOrganizationRequestValidator : AbstractValidator<UpdateOrganizationRequest>
{
    public UpdateOrganizationRequestValidator()
    {
        RuleFor(x => x.Name)
            .MinimumLength(1).WithMessage("Organization name must be at least 1 character.")
            .MaximumLength(200).WithMessage("Organization name must not exceed 200 characters.")
            .When(x => !string.IsNullOrEmpty(x.Name));

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Description must not exceed 1000 characters.")
            .When(x => x.Description != null);
    }
}
