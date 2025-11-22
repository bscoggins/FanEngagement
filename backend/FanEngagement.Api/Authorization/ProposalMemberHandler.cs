using System.Security.Claims;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Api.Authorization;

/// <summary>
/// Handler that checks if the user is a member of the organization that owns the proposal.
/// Handles the case where proposalId is in the route instead of organizationId.
/// </summary>
public class ProposalMemberHandler : AuthorizationHandler<OrganizationMemberRequirement>
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly FanEngagementDbContext _dbContext;

    public ProposalMemberHandler(IHttpContextAccessor httpContextAccessor, FanEngagementDbContext dbContext)
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

        var httpContext = _httpContextAccessor.HttpContext;
        
        // Check if we have a proposalId route value (ProposalsController case)
        if (httpContext?.Request.RouteValues.TryGetValue("proposalId", out var proposalIdObj) == true
            && Guid.TryParse(proposalIdObj?.ToString(), out var proposalId))
        {
            // Get the organizationId from the proposal
            var organizationId = await _dbContext.Proposals
                .Where(p => p.Id == proposalId)
                .Select(p => p.OrganizationId)
                .FirstOrDefaultAsync();

            if (organizationId == Guid.Empty)
            {
                return; // Proposal not found
            }

            // Check if user is a member of the proposal's organization
            var isMember = await _dbContext.OrganizationMemberships
                .AnyAsync(m => m.UserId == userId && m.OrganizationId == organizationId);

            if (isMember)
            {
                context.Succeed(requirement);
            }
        }
        // If no proposalId, let the other handler deal with it
    }
}
