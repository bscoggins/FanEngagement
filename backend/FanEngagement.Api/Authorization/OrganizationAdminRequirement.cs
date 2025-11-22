using Microsoft.AspNetCore.Authorization;

namespace FanEngagement.Api.Authorization;

/// <summary>
/// Requirement that the user must be an OrgAdmin of the organization specified in the route.
/// Global Admins bypass this check.
/// </summary>
public class OrganizationAdminRequirement : IAuthorizationRequirement
{
}
