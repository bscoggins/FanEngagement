namespace FanEngagement.Application.Validators;

/// <summary>
/// Constants for pagination parameter validation
/// </summary>
public static class PaginationValidators
{
    public const int DefaultPage = 1;
    public const int DefaultPageSize = 10;
    public const int MinPageSize = 1;
    public const int MaxPageSize = 100;
}
