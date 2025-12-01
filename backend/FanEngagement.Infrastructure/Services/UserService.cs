using FanEngagement.Application.Audit;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Common;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class UserService(FanEngagementDbContext dbContext, IAuthService authService, IAuditService auditService) : IUserService
{
    public async Task<UserDto> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (existing != null)
        {
            throw new InvalidOperationException($"A user with email {request.Email} already exists");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            DisplayName = request.DisplayName,
            PasswordHash = authService.HashPassword(request.Password),
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful commit - exclude password from audit details
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.Created)
                    .WithResource(AuditResourceType.User, user.Id, user.DisplayName)
                    .WithDetails(new { user.Email, user.DisplayName, user.Role })
                    .AsSuccess(),
                cancellationToken);
        }
        catch
        {
            // Audit failures should not fail user operations
        }

        return MapToDto(user);
    }

    public async Task<UserDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        return user == null ? null : MapToDto(user);
    }

    public async Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var users = await dbContext.Users
            .AsNoTracking()
            .OrderBy(u => u.Email)
            .ToListAsync(cancellationToken);

        return users.Select(MapToDto).ToList();
    }

    public async Task<PagedResult<UserDto>> GetAllAsync(int page, int pageSize, string? search = null, CancellationToken cancellationToken = default)
    {
        var query = dbContext.Users.AsNoTracking();

        // Apply search filter if provided (case-insensitive using EF.Functions.Like with LOWER)
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchPattern = $"%{search}%";
            query = query.Where(u => 
                EF.Functions.Like(u.Email.ToLower(), searchPattern.ToLower()) || 
                EF.Functions.Like(u.DisplayName.ToLower(), searchPattern.ToLower()));
        }

        // Get total count
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply pagination
        var users = await query
            .OrderBy(u => u.Email)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<UserDto>
        {
            Items = users.Select(MapToDto).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<UserDto?> UpdateAsync(Guid id, UpdateUserRequest request, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FindAsync([id], cancellationToken);
        if (user == null)
        {
            return null;
        }

        // Capture original values for audit
        var originalEmail = user.Email;
        var originalDisplayName = user.DisplayName;
        var originalRole = user.Role;

        // Check if email is changing and if the new email is already taken
        if (user.Email != request.Email)
        {
            var emailExists = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(u => u.Email == request.Email && u.Id != id, cancellationToken);

            if (emailExists)
            {
                throw new InvalidOperationException($"A user with email {request.Email} already exists");
            }
        }

        user.Email = request.Email;
        user.DisplayName = request.DisplayName;
        if (request.Role.HasValue)
        {
            user.Role = request.Role.Value;
        }

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Concurrency conflict detected; return null or handle as needed
            return null;
        }

        // Audit after successful update
        var hasRoleChange = originalRole != user.Role;
        var changedFields = new List<string>();
        var details = new Dictionary<string, object>();

        if (originalEmail != user.Email)
        {
            changedFields.Add("Email");
            details["oldEmail"] = originalEmail;
            details["newEmail"] = user.Email;
        }

        if (originalDisplayName != user.DisplayName)
        {
            changedFields.Add("DisplayName");
            details["oldDisplayName"] = originalDisplayName;
            details["newDisplayName"] = user.DisplayName;
        }

        if (hasRoleChange)
        {
            changedFields.Add("Role");
            details["oldRole"] = originalRole.ToString();
            details["newRole"] = user.Role.ToString();

            // Separate audit event for role changes (privilege escalation tracking)
            try
            {
                await auditService.LogAsync(
                    new AuditEventBuilder()
                        .WithAction(AuditActionType.RoleChanged)
                        .WithResource(AuditResourceType.User, user.Id, user.DisplayName)
                        .WithDetails(new
                        {
                            oldRole = originalRole.ToString(),
                            newRole = user.Role.ToString()
                        })
                        .AsSuccess(),
                    cancellationToken);
            }
            catch
            {
                // Audit failures should not fail user operations
            }
        }

        // General update audit event
        if (changedFields.Count > 0)
        {
            details["changedFields"] = changedFields;

            try
            {
                await auditService.LogAsync(
                    new AuditEventBuilder()
                        .WithAction(AuditActionType.Updated)
                        .WithResource(AuditResourceType.User, user.Id, user.DisplayName)
                        .WithDetails(details)
                        .AsSuccess(),
                    cancellationToken);
            }
            catch
            {
                // Audit failures should not fail user operations
            }
        }

        return MapToDto(user);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FindAsync([id], cancellationToken);
        if (user == null)
        {
            return false;
        }

        // Capture user details before deletion for audit
        var displayName = user.DisplayName;
        var email = user.Email;

        dbContext.Users.Remove(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful deletion
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.Deleted)
                    .WithResource(AuditResourceType.User, id, displayName)
                    .WithDetails(new { email, displayName })
                    .AsSuccess(),
                cancellationToken);
        }
        catch
        {
            // Audit failures should not fail user operations
        }

        return true;
    }

    private static UserDto MapToDto(User user)
    {
        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            Role = user.Role,
            CreatedAt = user.CreatedAt
        };
    }
}
