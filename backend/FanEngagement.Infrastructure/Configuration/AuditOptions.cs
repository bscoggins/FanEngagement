namespace FanEngagement.Infrastructure.Configuration;

/// <summary>
/// Configuration options for the audit service and background persistence.
/// </summary>
public class AuditOptions
{
    /// <summary>
    /// Directory for fallback files when database is unavailable.
    /// If null, defaults to platform-appropriate temporary directory.
    /// </summary>
    public string? FallbackDirectory { get; set; }
    
    /// <summary>
    /// Maximum events in the async channel before dropping. Default: 10000.
    /// </summary>
    public int ChannelCapacity { get; set; } = 10000;
    
    /// <summary>
    /// Number of events to persist per batch. Default: 100.
    /// </summary>
    public int BatchSize { get; set; } = 100;
    
    /// <summary>
    /// Maximum time to wait before flushing a partial batch (milliseconds). Default: 1000ms.
    /// </summary>
    public int BatchIntervalMs { get; set; } = 1000;
}
