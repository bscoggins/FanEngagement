using FluentValidation;

namespace FanEngagement.Application.Validators;

/// <summary>
/// Base class for pagination parameter validation
/// </summary>
public static class PaginationValidators
{
    public const int DefaultPage = 1;
    public const int DefaultPageSize = 10;
    public const int MinPageSize = 1;
    public const int MaxPageSize = 100;

    public static IRuleBuilderOptions<T, int> ValidatePage<T>(this IRuleBuilder<T, int> ruleBuilder)
    {
        return ruleBuilder
            .GreaterThanOrEqualTo(1)
            .WithMessage("Page must be greater than or equal to 1.");
    }

    public static IRuleBuilderOptions<T, int> ValidatePageSize<T>(this IRuleBuilder<T, int> ruleBuilder)
    {
        return ruleBuilder
            .GreaterThanOrEqualTo(MinPageSize)
            .WithMessage($"PageSize must be greater than or equal to {MinPageSize}.")
            .LessThanOrEqualTo(MaxPageSize)
            .WithMessage($"PageSize must not exceed {MaxPageSize}.");
    }
}
