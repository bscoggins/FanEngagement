using FanEngagement.Domain.Enums;

namespace FanEngagement.Domain.Entities;

public class OrganizationMembership
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public Guid UserId { get; set; }
    public OrganizationRole Role { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Organization? Organization { get; set; }
    public User? User { get; set; }
}
