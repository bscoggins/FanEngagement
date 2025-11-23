namespace FanEngagement.Infrastructure.Configuration;

/// <summary>
/// Configuration options for the proposal lifecycle background service.
/// </summary>
public class ProposalLifecycleOptions
{
    private int _pollingIntervalSeconds = 60;
    private int _maxProposalsPerBatch = 100;

    /// <summary>
    /// How frequently the background service checks for proposals to transition (in seconds).
    /// Default: 60 seconds. Must be greater than 0.
    /// </summary>
    public int PollingIntervalSeconds 
    { 
        get => _pollingIntervalSeconds;
        set
        {
            if (value <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "PollingIntervalSeconds must be greater than 0");
            }
            _pollingIntervalSeconds = value;
        }
    }

    /// <summary>
    /// Maximum number of proposals to process in a single batch.
    /// Default: 100. Must be between 1 and 1000.
    /// </summary>
    public int MaxProposalsPerBatch 
    { 
        get => _maxProposalsPerBatch;
        set
        {
            if (value <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "MaxProposalsPerBatch must be greater than 0");
            }
            if (value > 1000)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "MaxProposalsPerBatch must not exceed 1000");
            }
            _maxProposalsPerBatch = value;
        }
    }
}
