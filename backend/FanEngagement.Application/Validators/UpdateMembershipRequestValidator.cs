using FluentValidation;

namespace FanEngagement.Application.Validators;

public class UpdateMembershipRequestValidator : AbstractValidator<Memberships.UpdateMembershipRequest>
{
    public UpdateMembershipRequestValidator()
    {
        RuleFor(x => x.Role)
            .IsInEnum()
            .WithMessage("Role must be a valid OrganizationRole.");
    }
}
