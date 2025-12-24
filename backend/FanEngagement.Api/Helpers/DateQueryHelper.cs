using Microsoft.AspNetCore.Http;

namespace FanEngagement.Api.Helpers;

public static class DateQueryHelper
{
    public static void ApplyDateRangeFallback(HttpRequest request, ref DateTimeOffset? dateFrom, ref DateTimeOffset? dateTo)
    {
        if (!dateFrom.HasValue && request.Query.TryGetValue("dateFrom", out var rawDateFrom) &&
            DateTimeOffset.TryParse(rawDateFrom, out var parsedDateFrom))
        {
            dateFrom = parsedDateFrom;
        }

        if (!dateTo.HasValue && request.Query.TryGetValue("dateTo", out var rawDateTo) &&
            DateTimeOffset.TryParse(rawDateTo, out var parsedDateTo))
        {
            dateTo = parsedDateTo;
        }
    }
}
