namespace FanEngagement.Infrastructure.Configuration;

/// <summary>
/// Configuration options for the proposal lifecycle background service.
/// </summary>
public class ProposalLifecycleOptions
{
    /// <summary>
    /// How frequently the background service checks for proposals to transition (in seconds).
    /// Default: 60 seconds
    /// </summary>
    public int PollingIntervalSeconds { get; set; } = 60;

    /// <summary>
    /// Maximum number of proposals to process in a single batch.
    /// Default: 100
    /// </summary>
    public int MaxProposalsPerBatch { get; set; } = 100;
}
