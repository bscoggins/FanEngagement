namespace FanEngagement.Application.Audit;

/// <summary>
/// Request parameters for audit event export.
/// </summary>
public class AuditExportRequest
{
    /// <summary>
    /// Export format: "csv" or "json"
    /// </summary>
    public string Format { get; set; } = "csv";

    /// <summary>
    /// Batch size for streaming exports (default: 100)
    /// </summary>
    public int BatchSize { get; set; } = 100;
}
