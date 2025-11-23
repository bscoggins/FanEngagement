using FanEngagement.Application.Common;
using FanEngagement.Domain.Entities;

namespace FanEngagement.Application.Organizations;

public interface IOrganizationService
{
    Task<Organization> CreateAsync(CreateOrganizationRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Organization>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PagedResult<Organization>> GetAllAsync(int page, int pageSize, string? search = null, CancellationToken cancellationToken = default);
    Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Organization?> UpdateAsync(Guid id, UpdateOrganizationRequest request, CancellationToken cancellationToken = default);
}
