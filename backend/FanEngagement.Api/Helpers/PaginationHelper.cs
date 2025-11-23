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
            var problemDetails = new ProblemDetails
            {
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                Title = "Invalid Pagination Parameter",
                Status = 400,
                Detail = "Page must be greater than or equal to 1."
            };
            return new BadRequestObjectResult(problemDetails);
        }
        
        if (pageSize < PaginationValidators.MinPageSize || pageSize > PaginationValidators.MaxPageSize)
        {
            var problemDetails = new ProblemDetails
            {
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                Title = "Invalid Pagination Parameter",
                Status = 400,
                Detail = $"PageSize must be between {PaginationValidators.MinPageSize} and {PaginationValidators.MaxPageSize}."
            };
            return new BadRequestObjectResult(problemDetails);
        }
        
        return null;
    }
}
