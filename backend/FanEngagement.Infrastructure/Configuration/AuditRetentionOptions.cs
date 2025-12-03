namespace FanEngagement.Infrastructure.Configuration;

/// <summary>
/// Configuration options for audit log retention and automatic purging.
/// </summary>
public class AuditRetentionOptions
{
    private int _retentionDays = 365;
    private int _purgeBatchSize = 1000;
    private string _purgeSchedule = "0 2 * * *";

    /// <summary>
    /// Number of days to retain audit events. Events older than this are purged.
    /// Default: 365 days. Must be at least 30 days.
    /// </summary>
    public int RetentionDays
    {
        get => _retentionDays;
        set
        {
            if (value < 30)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "RetentionDays must be at least 30 days");
            }
            _retentionDays = value;
        }
    }

    /// <summary>
    /// Number of events to delete per batch to avoid locking the database.
    /// Default: 1000. Must be between 1 and 10000.
    /// </summary>
    public int PurgeBatchSize
    {
        get => _purgeBatchSize;
        set
        {
            if (value <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "PurgeBatchSize must be greater than 0");
            }
            if (value > 10000)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "PurgeBatchSize must not exceed 10000");
            }
            _purgeBatchSize = value;
        }
    }

    /// <summary>
    /// Cron expression for purge schedule. Default: "0 2 * * *" (daily at 2 AM UTC).
    /// Format: minute hour day-of-month month day-of-week
    /// </summary>
    public string PurgeSchedule
    {
        get => _purgeSchedule;
        set
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ArgumentException("PurgeSchedule cannot be null or empty", nameof(value));
            }
            _purgeSchedule = value;
        }
    }
}
