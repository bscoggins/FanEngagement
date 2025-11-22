using FanEngagement.Application.ShareTypes;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class CreateShareTypeRequestValidator : AbstractValidator<CreateShareTypeRequest>
{
    public CreateShareTypeRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Share type name is required.")
            .MinimumLength(1).WithMessage("Share type name must be at least 1 character.")
            .MaximumLength(100).WithMessage("Share type name must not exceed 100 characters.");

        RuleFor(x => x.Symbol)
            .NotEmpty().WithMessage("Share type symbol is required.")
            .MinimumLength(1).WithMessage("Share type symbol must be at least 1 character.")
            .MaximumLength(10).WithMessage("Share type symbol must not exceed 10 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Description must not exceed 500 characters.")
            .When(x => x.Description != null);

        RuleFor(x => x.VotingWeight)
            .GreaterThanOrEqualTo(0).WithMessage("Voting weight must be greater than or equal to 0.");

        RuleFor(x => x.MaxSupply)
            .GreaterThan(0).WithMessage("Max supply must be greater than 0.")
            .When(x => x.MaxSupply.HasValue);
    }
}
