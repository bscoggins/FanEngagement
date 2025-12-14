using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.FeatureFlags;

public interface IFeatureFlagService
{
    Task<IReadOnlyList<FeatureFlagDto>> GetForOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<FeatureFlagDto> SetAsync(Guid organizationId, OrganizationFeature feature, bool enabled, Guid actorUserId, CancellationToken cancellationToken = default);
    Task<bool> IsEnabledAsync(Guid organizationId, OrganizationFeature feature, CancellationToken cancellationToken = default);
}
