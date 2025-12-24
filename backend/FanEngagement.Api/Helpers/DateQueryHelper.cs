using System.Globalization;
using Microsoft.AspNetCore.Http;

namespace FanEngagement.Api.Helpers;

/// <summary>
/// Applies fallback date range values from the HTTP query string when not already provided by the caller.
/// </summary>
public static class DateQueryHelper
{
    /// <summary>
    /// Populates <paramref name="dateFrom" /> or <paramref name="dateTo" /> from query parameters when they are null.
    /// Accepts whitespace around date strings and swaps reversed ranges so the resulting window is valid.
    /// </summary>
    /// <param name="request">The current HTTP request whose query string may contain <c>dateFrom</c> and <c>dateTo</c>.</param>
    /// <param name="dateFrom">Nullable start of the date range; only set when currently null.</param>
    /// <param name="dateTo">Nullable end of the date range; only set when currently null.</param>
    public static void ApplyDateRangeFallback(HttpRequest request, ref DateTimeOffset? dateFrom, ref DateTimeOffset? dateTo)
    {
        if (request == null || request.Query.Count == 0)
        {
            return;
        }

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

        // If the range was provided in reverse order, swap to ensure a valid window.
        if (dateFrom.HasValue && dateTo.HasValue && dateFrom > dateTo)
        {
            (dateFrom, dateTo) = (dateTo, dateFrom);
        }
    }
}
