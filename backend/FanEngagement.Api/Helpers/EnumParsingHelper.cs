using System;
using System.Collections.Generic;
using System.Linq;

namespace FanEngagement.Api.Helpers;

/// <summary>
/// Helper methods for parsing enum values from query strings.
/// </summary>
public static class EnumParsingHelper
{
    /// <summary>
    /// Parse comma-separated enum list from query string.
    /// </summary>
    public static List<T>? ParseEnumList<T>(string? input) where T : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(input))
            return null;

        var values = input.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(s => Enum.TryParse<T>(s, true, out var value) ? (T?)value : null)
            .Where(v => v.HasValue)
            .Select(v => v!.Value)
            .ToList();

        return values.Count > 0 ? values : null;
    }

    /// <summary>
    /// Parse single enum value from query string.
    /// </summary>
    public static T? ParseEnum<T>(string? input) where T : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(input))
            return null;

        return Enum.TryParse<T>(input, true, out var value) ? value : null;
    }
}
