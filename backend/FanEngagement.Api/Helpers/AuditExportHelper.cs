using System.Text;
using System.Text.Json;
using FanEngagement.Application.Audit;

namespace FanEngagement.Api.Helpers;

/// <summary>
/// Helper class for exporting audit events in various formats.
/// </summary>
public static class AuditExportHelper
{
    /// <summary>
    /// Converts a batch of audit events to CSV format.
    /// </summary>
    public static string ToCsv(List<AuditEventDto> events, bool includeHeader)
    {
        var sb = new StringBuilder();

        if (includeHeader)
        {
            sb.AppendLine("Id,Timestamp,ActorUserId,ActorDisplayName,ActorIpAddress,ActionType,Outcome,FailureReason,ResourceType,ResourceId,ResourceName,OrganizationId,OrganizationName,CorrelationId");
        }

        var csvLines = events.Select(evt => new[]
        {
            EscapeCsv(evt.Id.ToString()),
            EscapeCsv(evt.Timestamp.ToString("o")),
            EscapeCsv(evt.ActorUserId?.ToString()),
            EscapeCsv(evt.ActorDisplayName),
            EscapeCsv(evt.ActorIpAddress),
            EscapeCsv(evt.ActionType.ToString()),
            EscapeCsv(evt.Outcome.ToString()),
            EscapeCsv(evt.FailureReason),
            EscapeCsv(evt.ResourceType.ToString()),
            EscapeCsv(evt.ResourceId.ToString()),
            EscapeCsv(evt.ResourceName),
            EscapeCsv(evt.OrganizationId?.ToString()),
            EscapeCsv(evt.OrganizationName),
            EscapeCsv(evt.CorrelationId)
        });

        foreach (var fields in csvLines)
        {
            sb.AppendLine(string.Join(",", fields));
        }

        return sb.ToString();
    }

    /// <summary>
    /// Converts a batch of audit events to JSON format (streaming JSON array).
    /// </summary>
    public static string ToJson(List<AuditEventDto> events, bool isFirstBatch, bool isLastBatch)
    {
        var sb = new StringBuilder();

        if (isFirstBatch)
        {
            sb.Append('[');
        }

        for (int i = 0; i < events.Count; i++)
        {
            if (!isFirstBatch || i > 0)
            {
                sb.Append(',');
            }
            sb.Append(JsonSerializer.Serialize(events[i], new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
            }));
        }

        if (isLastBatch)
        {
            sb.Append(']');
        }

        return sb.ToString();
    }

    /// <summary>
    /// Escapes a CSV field value by wrapping in quotes if necessary and escaping quotes.
    /// </summary>
    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        // If the value contains comma, quote, or newline, wrap it in quotes
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }
}
