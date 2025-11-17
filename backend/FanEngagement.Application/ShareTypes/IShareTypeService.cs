using FanEngagement.Domain.Entities;

namespace FanEngagement.Application.ShareTypes;

public interface IShareTypeService
{
    Task<ShareType> CreateAsync(Guid organizationId, CreateShareTypeRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ShareType>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
}
