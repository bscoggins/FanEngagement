using FanEngagement.Application.Audit;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Users;
using FanEngagement.Application.Exceptions;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.Services;

public class MembershipService(FanEngagementDbContext dbContext, IAuditService auditService, ILogger<MembershipService> logger) : IMembershipService
{
    public async Task<MembershipDto> CreateAsync(Guid organizationId, CreateMembershipRequest request, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default)
    {
        // Validate organization exists
        var organization = await dbContext.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken);

        if (organization == null)
        {
            throw new InvalidOperationException($"Organization {organizationId} not found");
        }

        // Validate user exists
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null)
        {
            throw new InvalidOperationException($"User {request.UserId} not found");
        }

        // Check if membership already exists
        var existing = await dbContext.OrganizationMemberships
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == request.UserId, cancellationToken);

        if (existing != null)
        {
            throw new ConflictException($"User {request.UserId} is already a member of organization {organizationId}");
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

        // Audit after successful commit
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithActor(actorUserId, actorDisplayName)
                    .WithAction(AuditActionType.Created)
                    .WithResource(AuditResourceType.Membership, membership.Id)
                    .WithOrganization(organizationId, organization.Name)
                    .WithDetails(new
                    {
                        TargetUserId = user.Id,
                        TargetUserName = user.DisplayName,
                        TargetUserEmail = user.Email,
                        OrganizationId = organizationId,
                        OrganizationName = organization.Name,
                        Role = request.Role.ToString(),
                        InviterUserId = actorUserId,
                        InviterDisplayName = actorDisplayName
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail membership operations
            logger.LogWarning(ex, "Failed to audit membership creation for user {UserId} in organization {OrganizationId}", request.UserId, organizationId);
        }

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

    public async Task<bool> DeleteAsync(Guid organizationId, Guid userId, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default)
    {
        var membership = await dbContext.OrganizationMemberships
            .Include(m => m.User)
            .Include(m => m.Organization)
            .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId, cancellationToken);

        if (membership == null)
        {
            return false;
        }

        // Capture details before deletion
        var targetUserName = membership.User?.DisplayName ?? "Unknown";
        var targetUserEmail = membership.User?.Email ?? string.Empty;
        var organizationName = membership.Organization?.Name ?? string.Empty;
        var role = membership.Role;

        dbContext.OrganizationMemberships.Remove(membership);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful commit
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithActor(actorUserId, actorDisplayName)
                    .WithAction(AuditActionType.Deleted)
                    .WithResource(AuditResourceType.Membership, membership.Id)
                    .WithOrganization(organizationId, organizationName)
                    .WithDetails(new
                    {
                        TargetUserId = userId,
                        TargetUserName = targetUserName,
                        TargetUserEmail = targetUserEmail,
                        OrganizationId = organizationId,
                        OrganizationName = organizationName,
                        Role = role.ToString(),
                        RemovedByUserId = actorUserId,
                        RemovedByDisplayName = actorDisplayName
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail membership operations
            logger.LogWarning(ex, "Failed to audit membership deletion for user {UserId} in organization {OrganizationId}", userId, organizationId);
        }

        return true;
    }

    public async Task<MembershipDto?> UpdateRoleAsync(Guid organizationId, Guid userId, OrganizationRole newRole, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default)
    {
        var membership = await dbContext.OrganizationMemberships
            .Include(m => m.User)
            .Include(m => m.Organization)
            .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId, cancellationToken);

        if (membership == null)
        {
            return null;
        }

        var oldRole = membership.Role;
        
        // Check if there's actually a change
        if (oldRole == newRole)
        {
            return MapToDto(membership);
        }

        var targetUserName = membership.User?.DisplayName ?? "Unknown";
        var targetUserEmail = membership.User?.Email ?? string.Empty;
        var organizationName = membership.Organization?.Name ?? string.Empty;

        membership.Role = newRole;
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful commit
        try
        {
            // Determine if this is a privilege escalation
            // OrgAdmin (0) > Member (1), so lower numeric value = higher privilege
            var isPrivilegeEscalation = newRole < oldRole;

            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithActor(actorUserId, actorDisplayName)
                    .WithAction(AuditActionType.RoleChanged)
                    .WithResource(AuditResourceType.Membership, membership.Id)
                    .WithOrganization(organizationId, organizationName)
                    .WithDetails(new
                    {
                        TargetUserId = userId,
                        TargetUserName = targetUserName,
                        TargetUserEmail = targetUserEmail,
                        OrganizationId = organizationId,
                        OrganizationName = organizationName,
                        OldRole = oldRole.ToString(),
                        NewRole = newRole.ToString(),
                        IsPrivilegeEscalation = isPrivilegeEscalation,
                        ChangedByUserId = actorUserId,
                        ChangedByDisplayName = actorDisplayName
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail membership operations
            logger.LogWarning(ex, "Failed to audit role change for user {UserId} in organization {OrganizationId}", userId, organizationId);
        }

        return MapToDto(membership);
    }

    public async Task<IReadOnlyList<UserDto>> GetAvailableUsersAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        // Validate organization exists
        var organizationExists = await dbContext.Organizations
            .AsNoTracking()
            .AnyAsync(o => o.Id == organizationId, cancellationToken);

        if (!organizationExists)
        {
            throw new InvalidOperationException($"Organization {organizationId} not found");
        }

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
