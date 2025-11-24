using FanEngagement.Application.Common;
using FanEngagement.Application.Organizations;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class OrganizationService(FanEngagementDbContext dbContext) : IOrganizationService
{
    public async Task<Organization> CreateAsync(CreateOrganizationRequest request, Guid creatorUserId, CancellationToken cancellationToken = default)
    {
        // Validate that the creator user exists
        var userExists = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.Id == creatorUserId, cancellationToken);

        if (!userExists)
        {
            throw new InvalidOperationException($"User {creatorUserId} not found");
        }

        var organization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            LogoUrl = request.LogoUrl,
            PrimaryColor = request.PrimaryColor,
            SecondaryColor = request.SecondaryColor,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Organizations.Add(organization);

        // Automatically create OrgAdmin membership for the creator
        var membership = new OrganizationMembership
        {
            Id = Guid.NewGuid(),
            OrganizationId = organization.Id,
            UserId = creatorUserId,
            Role = OrganizationRole.OrgAdmin,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.OrganizationMemberships.Add(membership);

        // Save both in a single transaction
        await dbContext.SaveChangesAsync(cancellationToken);

        return organization;
    }

    public async Task<IReadOnlyList<Organization>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var organizations = await dbContext.Organizations
            .AsNoTracking()
            .OrderBy(o => o.Name)
            .ToListAsync(cancellationToken);

        return organizations;
    }

    public async Task<PagedResult<Organization>> GetAllAsync(int page, int pageSize, string? search = null, CancellationToken cancellationToken = default)
    {
        var query = dbContext.Organizations.AsNoTracking();

        // Apply search filter if provided (case-insensitive using EF.Functions.Like with LOWER)
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchPattern = $"%{search}%";
            query = query.Where(o => EF.Functions.Like(o.Name.ToLower(), searchPattern.ToLower()));
        }

        // Get total count
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply pagination
        var organizations = await query
            .OrderBy(o => o.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Organization>
        {
            Items = organizations,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dbContext.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
    }

    public async Task<Organization?> UpdateAsync(Guid id, UpdateOrganizationRequest request, CancellationToken cancellationToken = default)
    {
        var organization = await dbContext.Organizations.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
        
        if (organization == null)
        {
            return null;
        }

        organization.Name = request.Name;
        organization.Description = request.Description;
        organization.LogoUrl = request.LogoUrl;
        organization.PrimaryColor = request.PrimaryColor;
        organization.SecondaryColor = request.SecondaryColor;

        await dbContext.SaveChangesAsync(cancellationToken);

        return organization;
    }
}
