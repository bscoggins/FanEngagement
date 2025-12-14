using FanEngagement.Application.FeatureFlags;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class FeatureFlagService(FanEngagementDbContext dbContext) : IFeatureFlagService
{
    private static readonly IReadOnlyDictionary<OrganizationFeature, (string Name, string Description)> FeatureMetadata = new Dictionary<OrganizationFeature, (string, string)>
    {
        {
            OrganizationFeature.BlockchainIntegration,
            (
                "Blockchain Integration",
                "Enable on-chain storage for organization data, share types, issuances, proposals, and votes."
            )
        }
    };

    public async Task<IReadOnlyList<FeatureFlagDto>> GetForOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        var flags = await dbContext.OrganizationFeatureFlags
            .AsNoTracking()
            .Where(f => f.OrganizationId == organizationId)
            .ToListAsync(cancellationToken);

        var results = new List<FeatureFlagDto>();
        foreach (var kvp in FeatureMetadata)
        {
            var existing = flags.FirstOrDefault(f => f.Feature == kvp.Key);
            results.Add(ToDto(kvp.Key, existing));
        }

        return results;
    }

    public async Task<FeatureFlagDto> SetAsync(Guid organizationId, OrganizationFeature feature, bool enabled, Guid actorUserId, CancellationToken cancellationToken = default)
    {
        if (!FeatureMetadata.ContainsKey(feature))
        {
            throw new InvalidOperationException($"Unsupported feature flag: {feature}");
        }

        // Validate that the organization exists
        var organizationExists = await dbContext.Organizations
            .AsNoTracking()
            .AnyAsync(o => o.Id == organizationId, cancellationToken);

        if (!organizationExists)
        {
            throw new InvalidOperationException($"Organization {organizationId} not found");
        }

        var existing = await dbContext.OrganizationFeatureFlags
            .FirstOrDefaultAsync(f => f.OrganizationId == organizationId && f.Feature == feature, cancellationToken);

        var now = DateTimeOffset.UtcNow;

        if (existing is null)
        {
            existing = new OrganizationFeatureFlag
            {
                Id = Guid.NewGuid(),
                OrganizationId = organizationId,
                Feature = feature,
                IsEnabled = enabled,
                EnabledAt = enabled ? now : null,
                EnabledByUserId = enabled ? actorUserId : null
            };
            dbContext.OrganizationFeatureFlags.Add(existing);
        }
        else
        {
            existing.IsEnabled = enabled;
            existing.EnabledAt = enabled ? now : null;
            existing.EnabledByUserId = enabled ? actorUserId : null;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(feature, existing);
    }

    public async Task<bool> IsEnabledAsync(Guid organizationId, OrganizationFeature feature, CancellationToken cancellationToken = default)
    {
        var flag = await dbContext.OrganizationFeatureFlags
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.OrganizationId == organizationId && f.Feature == feature, cancellationToken);

        return flag?.IsEnabled ?? false;
    }

    private FeatureFlagDto ToDto(OrganizationFeature feature, OrganizationFeatureFlag? entity)
    {
        var meta = FeatureMetadata[feature];
        return new FeatureFlagDto
        {
            Feature = feature,
            IsEnabled = entity?.IsEnabled ?? false,
            EnabledAt = entity?.EnabledAt,
            EnabledByUserId = entity?.EnabledByUserId,
            Name = meta.Name,
            Description = meta.Description
        };
    }
}
