using FanEngagement.Domain.Entities;

namespace FanEngagement.Application.ShareTypes;

public interface IShareTypeService
{
    Task<ShareType> CreateAsync(Guid organizationId, CreateShareTypeRequest request, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ShareType>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<ShareType?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ShareType?> UpdateAsync(Guid id, UpdateShareTypeRequest request, CancellationToken cancellationToken = default);
    Task<ShareType?> UpdateAsync(Guid organizationId, Guid id, UpdateShareTypeRequest request, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default);
}
