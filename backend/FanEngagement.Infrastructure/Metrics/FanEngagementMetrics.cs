using System.Diagnostics.Metrics;

namespace FanEngagement.Infrastructure.Metrics;

/// <summary>
/// Service that provides metrics instrumentation for FanEngagement.
/// Uses System.Diagnostics.Metrics for .NET observability.
/// Metrics can be exported to monitoring systems like Prometheus, Grafana, Application Insights, etc.
/// </summary>
public class FanEngagementMetrics
{
    private readonly Meter _meter;
    
    // Counters
    private readonly Counter<long> _webhookDeliveriesCounter;
    private readonly Counter<long> _proposalTransitionsCounter;
    private readonly Counter<long> _votesCounter;
    
    // Observable gauges (updated on-demand when scraped)
    private Func<int>? _pendingOutboundEventsProvider;
    private Func<Dictionary<string, int>>? _proposalsByStatusProvider;

    public FanEngagementMetrics(IMeterFactory meterFactory)
    {
        _meter = meterFactory.Create("FanEngagement");
        
        // Counters - track total counts over time
        _webhookDeliveriesCounter = _meter.CreateCounter<long>(
            "webhook_deliveries_total",
            description: "Total number of webhook delivery attempts");
        
        _proposalTransitionsCounter = _meter.CreateCounter<long>(
            "proposal_transitions_total",
            description: "Total number of proposal state transitions");
        
        _votesCounter = _meter.CreateCounter<long>(
            "votes_cast_total",
            description: "Total number of votes cast");
        
        // Observable gauges - current state metrics
        _meter.CreateObservableGauge(
            "outbound_events_pending",
            () => _pendingOutboundEventsProvider?.Invoke() ?? 0,
            description: "Number of pending outbound events");
        
        _meter.CreateObservableGauge(
            "proposals_by_status",
            () =>
            {
                var proposalsByStatus = _proposalsByStatusProvider?.Invoke() ?? new Dictionary<string, int>();
                return proposalsByStatus.Select(kvp => new Measurement<int>(kvp.Value, new KeyValuePair<string, object?>("status", kvp.Key)));
            },
            description: "Number of proposals by status");
    }

    /// <summary>
    /// Record a webhook delivery attempt with success/failure status
    /// </summary>
    public void RecordWebhookDelivery(bool success, string eventType, Guid organizationId)
    {
        _webhookDeliveriesCounter.Add(1,
            new KeyValuePair<string, object?>("success", success),
            new KeyValuePair<string, object?>("event_type", eventType),
            new KeyValuePair<string, object?>("organization_id", organizationId.ToString()));
    }

    /// <summary>
    /// Record a proposal state transition
    /// </summary>
    public void RecordProposalTransition(string fromStatus, string toStatus, Guid organizationId)
    {
        _proposalTransitionsCounter.Add(1,
            new KeyValuePair<string, object?>("from_status", fromStatus),
            new KeyValuePair<string, object?>("to_status", toStatus),
            new KeyValuePair<string, object?>("organization_id", organizationId.ToString()));
    }

    /// <summary>
    /// Record a vote cast
    /// </summary>
    public void RecordVoteCast(Guid proposalId, Guid organizationId)
    {
        _votesCounter.Add(1,
            new KeyValuePair<string, object?>("proposal_id", proposalId.ToString()),
            new KeyValuePair<string, object?>("organization_id", organizationId.ToString()));
    }

    /// <summary>
    /// Set the provider function for pending outbound events count
    /// </summary>
    public void SetPendingOutboundEventsProvider(Func<int> provider)
    {
        _pendingOutboundEventsProvider = provider;
    }

    /// <summary>
    /// Set the provider function for proposals by status counts
    /// </summary>
    public void SetProposalsByStatusProvider(Func<Dictionary<string, int>> provider)
    {
        _proposalsByStatusProvider = provider;
    }
}
