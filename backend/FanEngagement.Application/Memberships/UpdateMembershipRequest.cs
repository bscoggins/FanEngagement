using System.ComponentModel.DataAnnotations;
using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Memberships;

public class UpdateMembershipRequest
{
    [EnumDataType(typeof(OrganizationRole))]
    public OrganizationRole Role { get; set; }
}
