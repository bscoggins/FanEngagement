using System.Security.Claims;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Api.Authorization;

/// <summary>
/// Handler that checks if the user is a member of the organization specified in the route.
/// Global Admins automatically succeed.
/// </summary>
public class OrganizationMemberHandler : AuthorizationHandler<OrganizationMemberRequirement>
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly FanEngagementDbContext _dbContext;

    public OrganizationMemberHandler(IHttpContextAccessor httpContextAccessor, FanEngagementDbContext dbContext)
    {
        _httpContextAccessor = httpContextAccessor;
        _dbContext = dbContext;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, OrganizationMemberRequirement requirement)
    {
        // Check if user is Global Admin - they bypass all org checks
        if (context.User.IsInRole("Admin"))
        {
            context.Succeed(requirement);
            return;
        }

        // Get user ID from claims
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return; // No valid user ID, requirement not met
        }

        // Extract organizationId from route (try both 'organizationId' and 'id')
        var httpContext = _httpContextAccessor.HttpContext;
        Guid organizationId;
        
        if (httpContext?.Request.RouteValues.TryGetValue("organizationId", out var orgIdObj) == true 
            && Guid.TryParse(orgIdObj?.ToString(), out organizationId))
        {
            // Found organizationId
        }
        else if (httpContext?.Request.RouteValues.TryGetValue("id", out var idObj) == true 
                 && Guid.TryParse(idObj?.ToString(), out organizationId))
        {
            // Found id (used in OrganizationsController)
        }
        else
        {
            return; // No organizationId or id in route, requirement not met
        }

        // Check if user is a member of the organization
        var isMember = await _dbContext.OrganizationMemberships
            .AnyAsync(m => m.UserId == userId && m.OrganizationId == organizationId);

        if (isMember)
        {
            context.Succeed(requirement);
        }
    }
}
