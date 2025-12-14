using FanEngagement.Application.FeatureFlags;
using FanEngagement.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("organizations/{organizationId:guid}/feature-flags")]
[Authorize]
public class OrganizationFeatureFlagsController(
    IFeatureFlagService featureFlagService,
    IAuthorizationService authorizationService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FeatureFlagDto>>> Get(Guid organizationId, CancellationToken cancellationToken)
    {
        // Platform admins can always view. Non-admins must satisfy OrgAdmin policy.
        if (!User.IsInRole("Admin"))
        {
            var authResult = await authorizationService.AuthorizeAsync(User, null, "OrgAdmin");
            if (!authResult.Succeeded)
            {
                return Forbid();
            }
        }

        var flags = await featureFlagService.GetForOrganizationAsync(organizationId, cancellationToken);
        return Ok(flags);
    }

    [HttpPut("{feature}")]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult<FeatureFlagDto>> SetFlag(
        Guid organizationId,
        string feature,
        [FromBody] SetFeatureFlagRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<OrganizationFeature>(feature, ignoreCase: true, out var parsedFeature))
        {
            return BadRequest(new { message = $"Unknown feature: {feature}" });
        }

        var actorIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(actorIdClaim) || !Guid.TryParse(actorIdClaim, out var actorUserId))
        {
            return Unauthorized();
        }

        var updated = await featureFlagService.SetAsync(organizationId, parsedFeature, request.Enabled, actorUserId, cancellationToken);
        return Ok(updated);
    }
}
