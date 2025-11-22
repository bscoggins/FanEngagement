using Microsoft.AspNetCore.Authorization;

namespace FanEngagement.Api.Authorization;

/// <summary>
/// Requirement that the user must be a member of the organization specified in the route.
/// Global Admins bypass this check.
/// </summary>
public class OrganizationMemberRequirement : IAuthorizationRequirement
{
}
