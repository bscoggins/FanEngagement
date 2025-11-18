namespace FanEngagement.Application.ShareIssuances;

public interface IShareIssuanceService
{
    Task<ShareIssuanceDto> CreateAsync(Guid organizationId, CreateShareIssuanceRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ShareIssuanceDto>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ShareIssuanceDto>> GetByUserAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ShareBalanceDto>> GetBalancesByUserAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default);
}
