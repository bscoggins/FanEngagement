using FanEngagement.Application.Users;
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("Email must be a valid email address.")
            .MaximumLength(255).WithMessage("Email must not exceed 255 characters.")
            .When(x => !string.IsNullOrEmpty(x.Email));

        RuleFor(x => x.DisplayName)
            .MinimumLength(1).WithMessage("Display name must be at least 1 character.")
            .MaximumLength(100).WithMessage("Display name must not exceed 100 characters.")
            .When(x => !string.IsNullOrEmpty(x.DisplayName));
    }
}
