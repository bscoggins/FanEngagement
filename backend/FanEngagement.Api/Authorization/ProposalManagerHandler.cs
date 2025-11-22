using System.Security.Claims;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Api.Authorization;

/// <summary>
/// Handler that checks if the user can manage (update/close/modify options) a proposal.
/// Allows: Global Admin, OrgAdmin of the org, or the proposal creator.
/// </summary>
public class ProposalManagerHandler : AuthorizationHandler<ProposalManagerRequirement>
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly FanEngagementDbContext _dbContext;

    public ProposalManagerHandler(IHttpContextAccessor httpContextAccessor, FanEngagementDbContext dbContext)
    {
        _httpContextAccessor = httpContextAccessor;
        _dbContext = dbContext;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, ProposalManagerRequirement requirement)
    {
        // Check if user is Global Admin - they bypass all checks
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

        // Extract proposalId from route
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.Request.RouteValues.TryGetValue("proposalId", out var proposalIdObj) != true)
        {
            return; // No proposalId in route, requirement not met
        }

        if (!Guid.TryParse(proposalIdObj?.ToString(), out var proposalId))
        {
            return; // Invalid proposalId format
        }

        // Get proposal with organization info
        var proposal = await _dbContext.Proposals
            .Where(p => p.Id == proposalId)
            .Select(p => new { p.CreatedByUserId, p.OrganizationId })
            .FirstOrDefaultAsync();

        if (proposal == null)
        {
            return; // Proposal not found
        }

        // Check if user is the creator
        if (proposal.CreatedByUserId == userId)
        {
            context.Succeed(requirement);
            return;
        }

        // Check if user is an OrgAdmin of the proposal's organization
        var isOrgAdmin = await _dbContext.OrganizationMemberships
            .AnyAsync(m => m.UserId == userId && m.OrganizationId == proposal.OrganizationId && m.Role == OrganizationRole.OrgAdmin);

        if (isOrgAdmin)
        {
            context.Succeed(requirement);
        }
    }
}
