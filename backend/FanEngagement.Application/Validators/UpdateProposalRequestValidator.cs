using FanEngagement.Application.Proposals;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class UpdateProposalRequestValidator : AbstractValidator<UpdateProposalRequest>
{
    public UpdateProposalRequestValidator()
    {
        RuleFor(x => x.Title)
            .MaximumLength(200).WithMessage("Proposal title must not exceed 200 characters.")
            .When(x => !string.IsNullOrEmpty(x.Title));

        RuleFor(x => x.Description)
            .MaximumLength(5000).WithMessage("Description must not exceed 5000 characters.")
            .When(x => x.Description != null);
    }
}
