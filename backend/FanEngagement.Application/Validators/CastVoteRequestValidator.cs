using FanEngagement.Application.Proposals;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class CastVoteRequestValidator : AbstractValidator<CastVoteRequest>
{
    public CastVoteRequestValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("User ID is required.");

        RuleFor(x => x.ProposalOptionId)
            .NotEmpty().WithMessage("Proposal option ID is required.");
    }
}
