using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Memberships;

public class MembershipDto
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public Guid UserId { get; set; }
    public OrganizationRole Role { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
