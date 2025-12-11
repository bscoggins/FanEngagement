namespace FanEngagement.Application.Blockchain;

/// <summary>
/// Defines operations for blockchain adapters to record governance actions on-chain.
/// </summary>
public interface IBlockchainAdapter
{
    /// <summary>
    /// Records the creation of an organization on the blockchain.
    /// </summary>
    Task<CreateOrganizationResult> CreateOrganizationAsync(CreateOrganizationCommand command, CancellationToken cancellationToken);

    /// <summary>
    /// Records the creation of a share type on the blockchain.
    /// </summary>
    Task<CreateShareTypeResult> CreateShareTypeAsync(CreateShareTypeCommand command, CancellationToken cancellationToken);

    /// <summary>
    /// Records a share issuance (token mint) on the blockchain.
    /// </summary>
    Task<RecordShareIssuanceResult> RecordShareIssuanceAsync(RecordShareIssuanceCommand command, CancellationToken cancellationToken);

    /// <summary>
    /// Records an on-chain proposal with hashed content metadata.
    /// </summary>
    Task<CreateProposalResult> CreateProposalAsync(CreateProposalCommand command, CancellationToken cancellationToken);

    /// <summary>
    /// Records a vote on the blockchain.
    /// </summary>
    Task<BlockchainTransactionResult> RecordVoteAsync(RecordVoteCommand command, CancellationToken cancellationToken);

    /// <summary>
    /// Commits proposal results for verifiability.
    /// </summary>
    Task<BlockchainTransactionResult> CommitProposalResultsAsync(CommitProposalResultsCommand command, CancellationToken cancellationToken);
}
