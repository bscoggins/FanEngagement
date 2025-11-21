using FanEngagement.Application.ShareTypes;
using FanEngagement.Domain.Entities;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class ShareTypeService(FanEngagementDbContext dbContext) : IShareTypeService
{
    public async Task<ShareType> CreateAsync(Guid organizationId, CreateShareTypeRequest request, CancellationToken cancellationToken = default)
    {
        var shareType = new ShareType
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            Name = request.Name,
            Symbol = request.Symbol,
            Description = request.Description,
            VotingWeight = request.VotingWeight,
            MaxSupply = request.MaxSupply,
            IsTransferable = request.IsTransferable,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.ShareTypes.Add(shareType);
        await dbContext.SaveChangesAsync(cancellationToken);

        return shareType;
    }

    public async Task<IReadOnlyList<ShareType>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        var shareTypes = await dbContext.ShareTypes
            .AsNoTracking()
            .Where(st => st.OrganizationId == organizationId)
            .OrderBy(st => st.Name)
            .ToListAsync(cancellationToken);

        return shareTypes;
    }

    public async Task<ShareType?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dbContext.ShareTypes.AsNoTracking().FirstOrDefaultAsync(st => st.Id == id, cancellationToken);
    }

    public async Task<ShareType?> UpdateAsync(Guid id, UpdateShareTypeRequest request, CancellationToken cancellationToken = default)
    {
        var shareType = await dbContext.ShareTypes.FirstOrDefaultAsync(st => st.Id == id, cancellationToken);
        
        if (shareType == null)
        {
            return null;
        }

        UpdateShareTypeProperties(shareType, request);

        await dbContext.SaveChangesAsync(cancellationToken);

        return shareType;
    }

    public async Task<ShareType?> UpdateAsync(Guid organizationId, Guid id, UpdateShareTypeRequest request, CancellationToken cancellationToken = default)
    {
        var shareType = await dbContext.ShareTypes.FirstOrDefaultAsync(st => st.Id == id && st.OrganizationId == organizationId, cancellationToken);
        
        if (shareType == null)
        {
            return null;
        }

        UpdateShareTypeProperties(shareType, request);

        await dbContext.SaveChangesAsync(cancellationToken);

        return shareType;
    }

    private static void UpdateShareTypeProperties(ShareType shareType, UpdateShareTypeRequest request)
    {
        shareType.Name = request.Name;
        shareType.Symbol = request.Symbol;
        shareType.Description = request.Description;
        shareType.VotingWeight = request.VotingWeight;
        shareType.MaxSupply = request.MaxSupply;
        shareType.IsTransferable = request.IsTransferable;
    }
}
