using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Memberships;

public class MembershipWithOrganizationDto
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public OrganizationRole Role { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
