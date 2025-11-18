using System.ComponentModel.DataAnnotations;
using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Memberships;

public class CreateMembershipRequest
{
    [Required]
    public Guid UserId { get; set; }

    [EnumDataType(typeof(OrganizationRole))]
    public OrganizationRole Role { get; set; }
}
