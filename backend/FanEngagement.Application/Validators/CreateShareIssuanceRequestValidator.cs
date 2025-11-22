using FanEngagement.Application.ShareIssuances;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class CreateShareIssuanceRequestValidator : AbstractValidator<CreateShareIssuanceRequest>
{
    public CreateShareIssuanceRequestValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("User ID is required.");

        RuleFor(x => x.ShareTypeId)
            .NotEmpty().WithMessage("Share type ID is required.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be greater than 0.");

        RuleFor(x => x.Reason)
            .MaximumLength(500).WithMessage("Reason must not exceed 500 characters.")
            .When(x => x.Reason != null);
    }
}
