using FanEngagement.Application.Blockchain;

namespace FanEngagement.Infrastructure.Blockchain;

/// <summary>
/// No-op blockchain adapter for organizations that don't use blockchain.
/// </summary>
public class NullBlockchainAdapter : IBlockchainAdapter
{
    public Task<CreateOrganizationResult> CreateOrganizationAsync(CreateOrganizationCommand command, CancellationToken cancellationToken)
        => Task.FromResult(new CreateOrganizationResult(string.Empty, string.Empty));

    public Task<CreateShareTypeResult> CreateShareTypeAsync(CreateShareTypeCommand command, CancellationToken cancellationToken)
        => Task.FromResult(new CreateShareTypeResult(string.Empty, string.Empty));

    public Task<RecordShareIssuanceResult> RecordShareIssuanceAsync(RecordShareIssuanceCommand command, CancellationToken cancellationToken)
        => Task.FromResult(new RecordShareIssuanceResult(string.Empty, string.Empty));

    public Task<CreateProposalResult> CreateProposalAsync(CreateProposalCommand command, CancellationToken cancellationToken)
        => Task.FromResult(new CreateProposalResult(string.Empty, string.Empty));

    public Task<BlockchainTransactionResult> RecordVoteAsync(RecordVoteCommand command, CancellationToken cancellationToken)
        => Task.FromResult(new BlockchainTransactionResult(string.Empty));

    public Task<BlockchainTransactionResult> CommitProposalResultsAsync(CommitProposalResultsCommand command, CancellationToken cancellationToken)
        => Task.FromResult(new BlockchainTransactionResult(string.Empty));
}
