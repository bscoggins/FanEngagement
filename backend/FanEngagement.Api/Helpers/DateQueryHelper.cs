using System.Globalization;
using Microsoft.AspNetCore.Http;

namespace FanEngagement.Api.Helpers;

public static class DateQueryHelper
{
    public static void ApplyDateRangeFallback(HttpRequest request, ref DateTimeOffset? dateFrom, ref DateTimeOffset? dateTo)
    {
        if (request == null)
        {
            return;
        }

        if (!dateFrom.HasValue && request.Query.TryGetValue("dateFrom", out var rawDateFrom) &&
            DateTimeOffset.TryParse(rawDateFrom, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDateFrom))
        {
            dateFrom = parsedDateFrom;
        }

        if (!dateTo.HasValue && request.Query.TryGetValue("dateTo", out var rawDateTo) &&
            DateTimeOffset.TryParse(rawDateTo, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDateTo))
        {
            dateTo = parsedDateTo;
        }
    }
}
