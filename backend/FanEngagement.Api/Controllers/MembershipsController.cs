using FanEngagement.Application.Memberships;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("organizations/{organizationId:guid}/memberships")]
[Authorize]
public class MembershipsController(IMembershipService membershipService) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = "OrgAdmin")]
    public async Task<ActionResult> Create(Guid organizationId, [FromBody] CreateMembershipRequest request, CancellationToken cancellationToken)
    {
        // Get the current user ID and display name from claims
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var actorUserId))
        {
            return Unauthorized();
        }

        var actorDisplayName = User.FindFirst(ClaimTypes.Name)?.Value 
                              ?? User.FindFirst(ClaimTypes.Email)?.Value 
                              ?? "Unknown";

        var membership = await membershipService.CreateAsync(organizationId, request, actorUserId, actorDisplayName, cancellationToken);
        return CreatedAtAction(nameof(GetByUser), new { organizationId, userId = membership.UserId }, membership);
    }

    [HttpGet]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult> GetAll(Guid organizationId, [FromQuery] bool includeUserDetails = false, CancellationToken cancellationToken = default)
    {
        if (includeUserDetails)
        {
            var membershipsWithUsers = await membershipService.GetByOrganizationWithUserDetailsAsync(organizationId, cancellationToken);
            return Ok(membershipsWithUsers);
        }

        var memberships = await membershipService.GetByOrganizationAsync(organizationId, cancellationToken);
        return Ok(memberships);
    }

    [HttpGet("{userId:guid}")]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult> GetByUser(Guid organizationId, Guid userId, CancellationToken cancellationToken)
    {
        var membership = await membershipService.GetByOrganizationAndUserAsync(organizationId, userId, cancellationToken);
        if (membership is null)
        {
            return NotFound();
        }

        return Ok(membership);
    }

    [HttpGet("available-users")]
    [Authorize(Policy = "OrgAdmin")]
    public async Task<ActionResult> GetAvailableUsers(Guid organizationId, CancellationToken cancellationToken)
    {
        var availableUsers = await membershipService.GetAvailableUsersAsync(organizationId, cancellationToken);
        return Ok(availableUsers);
    }

    [HttpDelete("{userId:guid}")]
    [Authorize(Policy = "OrgAdmin")]
    public async Task<ActionResult> Delete(Guid organizationId, Guid userId, CancellationToken cancellationToken)
    {
        // Get the current user ID and display name from claims
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var actorUserId))
        {
            return Unauthorized();
        }

        var actorDisplayName = User.FindFirst(ClaimTypes.Name)?.Value 
                              ?? User.FindFirst(ClaimTypes.Email)?.Value 
                              ?? "Unknown";

        var deleted = await membershipService.DeleteAsync(organizationId, userId, actorUserId, actorDisplayName, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpPut("{userId:guid}")]
    [Authorize(Policy = "OrgAdmin")]
    public async Task<ActionResult> UpdateRole(Guid organizationId, Guid userId, [FromBody] UpdateMembershipRequest request, CancellationToken cancellationToken)
    {
        // Get the current user ID and display name from claims
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var actorUserId))
        {
            return Unauthorized();
        }

        var actorDisplayName = User.FindFirst(ClaimTypes.Name)?.Value 
                              ?? User.FindFirst(ClaimTypes.Email)?.Value 
                              ?? "Unknown";

        var membership = await membershipService.UpdateRoleAsync(organizationId, userId, request.Role, actorUserId, actorDisplayName, cancellationToken);
        return Ok(membership);
    }
}
