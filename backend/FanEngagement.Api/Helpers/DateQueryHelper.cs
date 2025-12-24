using System.Globalization;
using Microsoft.AspNetCore.Http;

namespace FanEngagement.Api.Helpers;

public static class DateQueryHelper
{
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
