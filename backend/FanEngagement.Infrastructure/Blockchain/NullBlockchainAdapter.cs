using FanEngagement.Application.Blockchain;

namespace FanEngagement.Infrastructure.Blockchain;

/// <summary>
/// No-op blockchain adapter for organizations that don't use blockchain.
/// </summary>
public class NullBlockchainAdapter : IBlockchainAdapter
{
    public Task<string> CreateOrganizationAsync(Guid organizationId, string name, CancellationToken cancellationToken)
    {
        // No-op: return empty transaction ID
        return Task.FromResult(string.Empty);
    }

    public Task<string> CreateShareTypeAsync(Guid shareTypeId, string name, string symbol, decimal votingWeight, CancellationToken cancellationToken)
    {
        // No-op: return empty transaction ID
        return Task.FromResult(string.Empty);
    }

    public Task<string> RecordVoteAsync(Guid voteId, Guid proposalId, Guid userId, decimal votingPower, CancellationToken cancellationToken)
    {
        // No-op: return empty transaction ID
        return Task.FromResult(string.Empty);
    }
}
