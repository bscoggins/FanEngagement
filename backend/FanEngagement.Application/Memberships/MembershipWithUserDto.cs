using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Memberships;

public class MembershipWithUserDto
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string UserDisplayName { get; set; } = string.Empty;
    public OrganizationRole Role { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
