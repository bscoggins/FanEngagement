using FanEngagement.Application.Validators;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Helpers;

/// <summary>
/// Helper class for pagination parameter validation in controllers
/// </summary>
public static class PaginationHelper
{
    /// <summary>
    /// Validates pagination parameters and returns a BadRequest ActionResult if invalid, otherwise null
    /// </summary>
    /// <param name="page">The page number to validate</param>
    /// <param name="pageSize">The page size to validate</param>
    /// <returns>ActionResult with BadRequest if invalid, otherwise null</returns>
    public static ActionResult? ValidatePaginationParameters(int page, int pageSize)
    {
        if (page < 1)
        {
            return new BadRequestObjectResult(new { error = "Page must be greater than or equal to 1." });
        }
        
        if (pageSize < PaginationValidators.MinPageSize || pageSize > PaginationValidators.MaxPageSize)
        {
            return new BadRequestObjectResult(new { error = $"PageSize must be between {PaginationValidators.MinPageSize} and {PaginationValidators.MaxPageSize}." });
        }
        
        return null;
    }
}
