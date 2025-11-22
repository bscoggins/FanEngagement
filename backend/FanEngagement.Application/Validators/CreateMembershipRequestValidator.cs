using FanEngagement.Application.Memberships;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class CreateMembershipRequestValidator : AbstractValidator<CreateMembershipRequest>
{
    public CreateMembershipRequestValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("User ID is required.");

        RuleFor(x => x.Role)
            .IsInEnum().WithMessage("Role must be a valid OrganizationRole value.");
    }
}
