using FanEngagement.Application.Proposals;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class AddProposalOptionRequestValidator : AbstractValidator<AddProposalOptionRequest>
{
    public AddProposalOptionRequestValidator()
    {
        RuleFor(x => x.Text)
            .NotEmpty().WithMessage("Option text is required.")
            .MaximumLength(200).WithMessage("Option text must not exceed 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Description must not exceed 1000 characters.")
            .When(x => x.Description != null);
    }
}
