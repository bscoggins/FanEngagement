using FanEngagement.Application.Users;
using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Memberships;

public interface IMembershipService
{
    Task<MembershipDto> CreateAsync(Guid organizationId, CreateMembershipRequest request, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MembershipDto>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MembershipWithUserDto>> GetByOrganizationWithUserDetailsAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<MembershipDto?> GetByOrganizationAndUserAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<MembershipWithOrganizationDto>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid organizationId, Guid userId, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default);
    Task<MembershipDto?> UpdateRoleAsync(Guid organizationId, Guid userId, OrganizationRole newRole, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserDto>> GetAvailableUsersAsync(Guid organizationId, CancellationToken cancellationToken = default);
}
