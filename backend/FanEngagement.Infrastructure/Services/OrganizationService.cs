using FanEngagement.Application.Organizations;
using FanEngagement.Domain.Entities;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class OrganizationService(FanEngagementDbContext dbContext) : IOrganizationService
{
    public async Task<Organization> CreateAsync(CreateOrganizationRequest request, CancellationToken cancellationToken = default)
    {
        var organization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Organizations.Add(organization);
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

    public async Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dbContext.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
    }
}
