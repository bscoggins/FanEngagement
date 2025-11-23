using FanEngagement.Application.Proposals;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class CreateProposalRequestValidator : AbstractValidator<CreateProposalRequest>
{
    public CreateProposalRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Proposal title is required.")
            .MaximumLength(200).WithMessage("Proposal title must not exceed 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(5000).WithMessage("Description must not exceed 5000 characters.")
            .When(x => x.Description != null);

        RuleFor(x => x.StartAt)
            .NotNull().WithMessage("Start date is required.")
            .LessThan(x => x.EndAt ?? DateTimeOffset.MaxValue)
            .WithMessage("Start date must be before end date.")
            .When(x => x.StartAt.HasValue && x.EndAt.HasValue);

        RuleFor(x => x.EndAt)
            .NotNull().WithMessage("End date is required.")
            .GreaterThan(x => x.StartAt ?? DateTimeOffset.MinValue)
            .WithMessage("End date must be after start date.")
            .When(x => x.StartAt.HasValue && x.EndAt.HasValue);

        RuleFor(x => x.QuorumRequirement)
            .GreaterThanOrEqualTo(0).WithMessage("Quorum requirement must be greater than or equal to 0.")
            .LessThanOrEqualTo(100).WithMessage("Quorum requirement must not exceed 100.")
            .When(x => x.QuorumRequirement.HasValue);

        RuleFor(x => x.CreatedByUserId)
            .NotEmpty().WithMessage("Created by user ID is required.");
    }
}
