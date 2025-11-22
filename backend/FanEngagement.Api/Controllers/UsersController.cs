using FanEngagement.Application.Memberships;
using FanEngagement.Application.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("users")]
[Authorize]
public class UsersController(IUserService userService, IMembershipService membershipService) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult> Create([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await userService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpGet]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult> GetAll(CancellationToken cancellationToken)
    {
        var users = await userService.GetAllAsync(cancellationToken);
        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await userService.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(user);
    }

    [HttpGet("{id:guid}/memberships")]
    public async Task<ActionResult> GetUserMemberships(Guid id, CancellationToken cancellationToken)
    {
        // Only allow access if the requesting user is the target user or has Admin role
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var requestingUserId))
        {
            return Forbid();
        }

        // Allow if user is viewing their own memberships or is an Admin
        if (requestingUserId != id && !User.IsInRole("Admin"))
        {
            return Forbid();
        }

        var memberships = await membershipService.GetByUserIdAsync(id, cancellationToken);
        return Ok(memberships);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await userService.UpdateAsync(id, request, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(user);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await userService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpGet("admin/stats")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> GetAdminStats(CancellationToken cancellationToken)
    {
        var users = await userService.GetAllAsync(cancellationToken);
        var stats = new
        {
            TotalUsers = users.Count,
            Message = "This endpoint is only accessible to administrators"
        };
        return Ok(stats);
    }
}
