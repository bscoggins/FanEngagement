using System.Globalization;
using Microsoft.AspNetCore.Http;

namespace FanEngagement.Api.Helpers;

/// <summary>
/// Applies fallback date range values from the HTTP query string when not already provided by the caller.
/// </summary>
/// <remarks>
/// <para>
/// Existing non-null values are never overwritten; this helper only populates null inputs from query parameters.
/// When both values are present but reversed, they are swapped to form a valid range. No additional range
/// constraints (such as maximum span) are enforced here; callers should validate business-specific limits as needed.
/// If both inputs are null and no query parameters are provided, the helper is a no-op.
/// </para>
/// </remarks>
public static class DateQueryHelper
{
    /// <summary>
    /// Populates <paramref name="dateFrom" /> or <paramref name="dateTo" /> from query parameters when they are null.
    /// Accepts whitespace around date strings and swaps reversed ranges so the resulting window is valid.
    /// </summary>
    /// <param name="request">The current HTTP request whose query string may contain <c>dateFrom</c> and <c>dateTo</c>.</param>
    /// <param name="dateFrom">Nullable start of the date range; only set when currently null.</param>
    /// <param name="dateTo">Nullable end of the date range; only set when currently null.</param>
    public static void ApplyDateRangeFallback(HttpRequest? request, ref DateTimeOffset? dateFrom, ref DateTimeOffset? dateTo)
    {
        if (request != null && request.Query.Count > 0)
        {
            if (!dateFrom.HasValue && request.Query.TryGetValue("dateFrom", out var rawDateFrom) &&
                DateTimeOffset.TryParse(rawDateFrom, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var parsedDateFrom))
            {
                dateFrom = parsedDateFrom;
            }

            if (!dateTo.HasValue && request.Query.TryGetValue("dateTo", out var rawDateTo) &&
                DateTimeOffset.TryParse(rawDateTo, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var parsedDateTo))
            {
                dateTo = parsedDateTo;
            }
        }

        // If the range was provided in reverse order, swap to ensure a valid window.
        if (dateFrom.HasValue && dateTo.HasValue && dateFrom > dateTo)
        {
            (dateFrom, dateTo) = (dateTo, dateFrom);
        }
    }
}
