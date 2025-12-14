using FanEngagement.Domain.Enums;

namespace FanEngagement.Domain.Entities;

public class OrganizationFeatureFlag
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public OrganizationFeature Feature { get; set; }
    public bool IsEnabled { get; set; }
    public DateTimeOffset? EnabledAt { get; set; }
    public Guid? EnabledByUserId { get; set; }

    public Organization? Organization { get; set; }
}
