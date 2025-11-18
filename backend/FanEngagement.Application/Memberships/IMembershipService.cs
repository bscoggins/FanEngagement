namespace FanEngagement.Application.Memberships;

public interface IMembershipService
{
    Task<MembershipDto> CreateAsync(Guid organizationId, CreateMembershipRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MembershipDto>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<MembershipDto?> GetByOrganizationAndUserAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default);
}
