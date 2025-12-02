using FanEngagement.Application.Audit;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.Services;

public class ShareTypeService(FanEngagementDbContext dbContext, IAuditService auditService, ILogger<ShareTypeService> logger) : IShareTypeService
{
    public async Task<ShareType> CreateAsync(Guid organizationId, CreateShareTypeRequest request, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default)
    {
        // Get organization for audit context
        var organization = await dbContext.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken);

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

        // Audit after successful commit
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithActor(actorUserId, actorDisplayName)
                    .WithAction(AuditActionType.Created)
                    .WithResource(AuditResourceType.ShareType, shareType.Id, shareType.Name)
                    .WithOrganization(organizationId, organization?.Name)
                    .WithDetails(new
                    {
                        Name = shareType.Name,
                        Symbol = shareType.Symbol,
                        Description = shareType.Description,
                        VotingWeight = shareType.VotingWeight,
                        MaxSupply = shareType.MaxSupply,
                        IsTransferable = shareType.IsTransferable
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail share type operations
            logger.LogWarning(ex, "Failed to audit share type creation for {ShareTypeId} in organization {OrganizationId}", shareType.Id, organizationId);
        }

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

    public async Task<ShareType?> UpdateAsync(Guid organizationId, Guid id, UpdateShareTypeRequest request, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default)
    {
        var shareType = await dbContext.ShareTypes.FirstOrDefaultAsync(st => st.Id == id && st.OrganizationId == organizationId, cancellationToken);
        
        if (shareType == null)
        {
            return null;
        }

        // Get organization for audit context
        var organization = await dbContext.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken);

        // Capture before values for audit
        var beforeValues = new
        {
            Name = shareType.Name,
            Symbol = shareType.Symbol,
            Description = shareType.Description,
            VotingWeight = shareType.VotingWeight,
            MaxSupply = shareType.MaxSupply,
            IsTransferable = shareType.IsTransferable
        };

        UpdateShareTypeProperties(shareType, request);

        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful commit
        try
        {
            var changes = new List<object>();
            if (beforeValues.Name != shareType.Name)
                changes.Add(new { Field = "Name", Before = beforeValues.Name, After = shareType.Name });
            if (beforeValues.Symbol != shareType.Symbol)
                changes.Add(new { Field = "Symbol", Before = beforeValues.Symbol, After = shareType.Symbol });
            if (beforeValues.Description != shareType.Description)
                changes.Add(new { Field = "Description", Before = beforeValues.Description, After = shareType.Description });
            if (beforeValues.VotingWeight != shareType.VotingWeight)
                changes.Add(new { Field = "VotingWeight", Before = beforeValues.VotingWeight, After = shareType.VotingWeight });
            if (beforeValues.MaxSupply != shareType.MaxSupply)
                changes.Add(new { Field = "MaxSupply", Before = beforeValues.MaxSupply, After = shareType.MaxSupply });
            if (beforeValues.IsTransferable != shareType.IsTransferable)
                changes.Add(new { Field = "IsTransferable", Before = beforeValues.IsTransferable, After = shareType.IsTransferable });

            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithActor(actorUserId, actorDisplayName)
                    .WithAction(AuditActionType.Updated)
                    .WithResource(AuditResourceType.ShareType, shareType.Id, shareType.Name)
                    .WithOrganization(organizationId, organization?.Name)
                    .WithDetails(new
                    {
                        Changes = changes,
                        BeforeValues = beforeValues,
                        AfterValues = new
                        {
                            Name = shareType.Name,
                            Symbol = shareType.Symbol,
                            Description = shareType.Description,
                            VotingWeight = shareType.VotingWeight,
                            MaxSupply = shareType.MaxSupply,
                            IsTransferable = shareType.IsTransferable
                        }
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail share type operations
            logger.LogWarning(ex, "Failed to audit share type update for {ShareTypeId} in organization {OrganizationId}", shareType.Id, organizationId);
        }

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
