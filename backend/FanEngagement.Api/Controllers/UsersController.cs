using FanEngagement.Application.Common;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Users;
using FanEngagement.Application.Validators;
using FanEngagement.Api.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("users")]
[Authorize]
public class UsersController(IUserService userService, IMembershipService membershipService) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting("Registration")]
    public async Task<ActionResult> Create([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await userService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpGet]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult> GetAll(
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        // If pagination parameters are provided, use paginated endpoint
        if (page.HasValue || pageSize.HasValue || !string.IsNullOrWhiteSpace(search))
        {
            var currentPage = page ?? PaginationValidators.DefaultPage;
            var currentPageSize = pageSize ?? PaginationValidators.DefaultPageSize;

            // Validate pagination parameters
            var validationError = PaginationHelper.ValidatePaginationParameters(currentPage, currentPageSize);
            if (validationError != null)
            {
                return validationError;
            }

            var pagedResult = await userService.GetAllAsync(currentPage, currentPageSize, search, cancellationToken);
            return Ok(pagedResult);
        }

        // Legacy endpoint - return all users without pagination
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

    [HttpGet("me/organizations")]
    public async Task<ActionResult> GetMyOrganizations(CancellationToken cancellationToken)
    {
        // Get the current user's ID from the JWT token
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Forbid();
        }

        var memberships = await membershipService.GetByUserIdAsync(userId, cancellationToken);
        return Ok(memberships);
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
