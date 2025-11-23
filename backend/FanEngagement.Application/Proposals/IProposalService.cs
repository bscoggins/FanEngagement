using FanEngagement.Application.Common;
using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Proposals;

public interface IProposalService
{
    Task<ProposalDto> CreateAsync(Guid organizationId, CreateProposalRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProposalDto>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<PagedResult<ProposalDto>> GetByOrganizationAsync(Guid organizationId, int page, int pageSize, ProposalStatus? status = null, string? search = null, CancellationToken cancellationToken = default);
    Task<ProposalDetailsDto?> GetByIdAsync(Guid proposalId, CancellationToken cancellationToken = default);
    Task<ProposalDto?> UpdateAsync(Guid proposalId, UpdateProposalRequest request, CancellationToken cancellationToken = default);
    Task<ProposalDto?> CloseAsync(Guid proposalId, CancellationToken cancellationToken = default);
    
    Task<ProposalOptionDto?> AddOptionAsync(Guid proposalId, AddProposalOptionRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteOptionAsync(Guid proposalId, Guid optionId, CancellationToken cancellationToken = default);
    
    Task<VoteDto?> CastVoteAsync(Guid proposalId, CastVoteRequest request, CancellationToken cancellationToken = default);
    Task<VoteDto?> GetUserVoteAsync(Guid proposalId, Guid userId, CancellationToken cancellationToken = default);
    Task<ProposalResultsDto?> GetResultsAsync(Guid proposalId, CancellationToken cancellationToken = default);
}
