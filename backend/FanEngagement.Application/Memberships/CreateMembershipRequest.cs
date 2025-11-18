using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Memberships;

public class CreateMembershipRequest
{
    public Guid UserId { get; set; }
    public OrganizationRole Role { get; set; }
}
