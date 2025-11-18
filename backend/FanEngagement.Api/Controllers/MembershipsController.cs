using FanEngagement.Application.Memberships;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("organizations/{organizationId:guid}/memberships")]
public class MembershipsController(IMembershipService membershipService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult> Create(Guid organizationId, [FromBody] CreateMembershipRequest request, CancellationToken cancellationToken)
    {
        var membership = await membershipService.CreateAsync(organizationId, request, cancellationToken);
        return CreatedAtAction(nameof(GetByUser), new { organizationId, userId = membership.UserId }, membership);
    }

    [HttpGet]
    public async Task<ActionResult> GetAll(Guid organizationId, CancellationToken cancellationToken)
    {
        var memberships = await membershipService.GetByOrganizationAsync(organizationId, cancellationToken);
        return Ok(memberships);
    }

    [HttpGet("{userId:guid}")]
    public async Task<ActionResult> GetByUser(Guid organizationId, Guid userId, CancellationToken cancellationToken)
    {
        var membership = await membershipService.GetByOrganizationAndUserAsync(organizationId, userId, cancellationToken);
        if (membership is null)
        {
            return NotFound();
        }

        return Ok(membership);
    }

    [HttpDelete("{userId:guid}")]
    public async Task<ActionResult> Delete(Guid organizationId, Guid userId, CancellationToken cancellationToken)
    {
        var deleted = await membershipService.DeleteAsync(organizationId, userId, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}
