using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.FeatureFlags;

public class FeatureFlagDto
{
    public OrganizationFeature Feature { get; set; }
    public bool IsEnabled { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTimeOffset? EnabledAt { get; set; }
    public Guid? EnabledByUserId { get; set; }
}
