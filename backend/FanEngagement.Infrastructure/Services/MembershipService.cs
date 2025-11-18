using FanEngagement.Application.Memberships;
using FanEngagement.Domain.Entities;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class MembershipService(FanEngagementDbContext dbContext) : IMembershipService
{
    public async Task<MembershipDto> CreateAsync(Guid organizationId, CreateMembershipRequest request, CancellationToken cancellationToken = default)
    {
        var membership = new OrganizationMembership
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            UserId = request.UserId,
            Role = request.Role,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.OrganizationMemberships.Add(membership);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(membership);
    }

    public async Task<IReadOnlyList<MembershipDto>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        var memberships = await dbContext.OrganizationMemberships
            .AsNoTracking()
            .Where(m => m.OrganizationId == organizationId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        return memberships.Select(MapToDto).ToList();
    }

    public async Task<MembershipDto?> GetByOrganizationAndUserAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default)
    {
        var membership = await dbContext.OrganizationMemberships
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId, cancellationToken);

        return membership == null ? null : MapToDto(membership);
    }

    public async Task<bool> DeleteAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default)
    {
        var membership = await dbContext.OrganizationMemberships
            .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId, cancellationToken);

        if (membership == null)
        {
            return false;
        }

        dbContext.OrganizationMemberships.Remove(membership);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static MembershipDto MapToDto(OrganizationMembership membership)
    {
        return new MembershipDto
        {
            Id = membership.Id,
            OrganizationId = membership.OrganizationId,
            UserId = membership.UserId,
            Role = membership.Role,
            CreatedAt = membership.CreatedAt
        };
    }
}
