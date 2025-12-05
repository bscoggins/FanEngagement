namespace FanEngagement.Application.Blockchain;

/// <summary>
/// Defines operations for blockchain adapters to record governance actions on-chain.
/// </summary>
public interface IBlockchainAdapter
{
    /// <summary>
    /// Records the creation of an organization on the blockchain.
    /// </summary>
    Task<string> CreateOrganizationAsync(Guid organizationId, string name, CancellationToken cancellationToken);

    /// <summary>
    /// Records the creation of a share type on the blockchain.
    /// </summary>
    Task<string> CreateShareTypeAsync(Guid shareTypeId, string name, string symbol, decimal votingWeight, CancellationToken cancellationToken);

    /// <summary>
    /// Records a vote on the blockchain.
    /// </summary>
    Task<string> RecordVoteAsync(Guid voteId, Guid proposalId, Guid userId, decimal votingPower, CancellationToken cancellationToken);
}
