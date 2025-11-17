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
}
