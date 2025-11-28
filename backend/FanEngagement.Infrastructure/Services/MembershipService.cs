using FanEngagement.Application.Memberships;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class MembershipService(FanEngagementDbContext dbContext) : IMembershipService
{
    public async Task<MembershipDto> CreateAsync(Guid organizationId, CreateMembershipRequest request, CancellationToken cancellationToken = default)
    {
        // Validate organization exists
        var organizationExists = await dbContext.Organizations
            .AsNoTracking()
            .AnyAsync(o => o.Id == organizationId, cancellationToken);

        if (!organizationExists)
        {
            throw new InvalidOperationException($"Organization {organizationId} not found");
        }

        // Validate user exists
        var userExists = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.Id == request.UserId, cancellationToken);

        if (!userExists)
        {
            throw new InvalidOperationException($"User {request.UserId} not found");
        }

        // Check if membership already exists
        var existing = await dbContext.OrganizationMemberships
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == request.UserId, cancellationToken);

        if (existing != null)
        {
            throw new InvalidOperationException($"User {request.UserId} is already a member of organization {organizationId}");
        }

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

    public async Task<IReadOnlyList<MembershipWithUserDto>> GetByOrganizationWithUserDetailsAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        var memberships = await dbContext.OrganizationMemberships
            .AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.OrganizationId == organizationId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        return memberships.Select(m => new MembershipWithUserDto
        {
            Id = m.Id,
            OrganizationId = m.OrganizationId,
            UserId = m.UserId,
            UserEmail = m.User?.Email ?? string.Empty,
            UserDisplayName = m.User?.DisplayName ?? string.Empty,
            Role = m.Role,
            CreatedAt = m.CreatedAt
        }).ToList();
    }

    public async Task<MembershipDto?> GetByOrganizationAndUserAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default)
    {
        var membership = await dbContext.OrganizationMemberships
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId, cancellationToken);

        return membership == null ? null : MapToDto(membership);
    }

    public async Task<IReadOnlyList<MembershipWithOrganizationDto>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var memberships = await dbContext.OrganizationMemberships
            .AsNoTracking()
            .Include(m => m.Organization)
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        return memberships.Select(m => new MembershipWithOrganizationDto
        {
            Id = m.Id,
            OrganizationId = m.OrganizationId,
            OrganizationName = m.Organization?.Name ?? string.Empty,
            UserId = m.UserId,
            Role = m.Role,
            CreatedAt = m.CreatedAt
        }).ToList();
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

    public async Task<IReadOnlyList<UserDto>> GetAvailableUsersAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        // Get all users that are NOT already members of this organization
        // Uses a subquery to efficiently filter in the database
        var memberUserIds = dbContext.OrganizationMemberships
            .Where(m => m.OrganizationId == organizationId)
            .Select(m => m.UserId);

        var availableUsers = await dbContext.Users
            .AsNoTracking()
            .Where(u => !memberUserIds.Contains(u.Id))
            .OrderBy(u => u.DisplayName)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Email = u.Email,
                DisplayName = u.DisplayName,
                Role = u.Role,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return availableUsers;
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
