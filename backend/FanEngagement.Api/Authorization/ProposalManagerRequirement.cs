using Microsoft.AspNetCore.Authorization;

namespace FanEngagement.Api.Authorization;

/// <summary>
/// Requirement that the user must be either:
/// - The creator of the proposal specified in the route, OR
/// - An OrgAdmin of the organization that owns the proposal, OR
/// - A Global Admin
/// </summary>
public class ProposalManagerRequirement : IAuthorizationRequirement
{
}
