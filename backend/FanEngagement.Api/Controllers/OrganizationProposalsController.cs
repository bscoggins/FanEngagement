using FanEngagement.Application.Common;
using FanEngagement.Application.Proposals;
using FanEngagement.Application.Validators;
using FanEngagement.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("organizations/{organizationId:guid}/proposals")]
[Authorize]
public class OrganizationProposalsController(IProposalService proposalService) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult> Create(Guid organizationId, [FromBody] CreateProposalRequest request, CancellationToken cancellationToken)
    {
        var proposal = await proposalService.CreateAsync(organizationId, request, cancellationToken);
        return CreatedAtRoute("GetProposalById", new { proposalId = proposal.Id }, proposal);
    }

    [HttpGet]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult> GetByOrganization(
        Guid organizationId,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        [FromQuery] ProposalStatus? status,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        // If pagination parameters are provided, use paginated endpoint
        if (page.HasValue || pageSize.HasValue || status.HasValue || !string.IsNullOrWhiteSpace(search))
        {
            var currentPage = page ?? PaginationValidators.DefaultPage;
            var currentPageSize = pageSize ?? PaginationValidators.DefaultPageSize;

            // Validate pagination parameters
            if (currentPage < 1)
            {
                return BadRequest(new { error = "Page must be greater than or equal to 1." });
            }
            if (currentPageSize < PaginationValidators.MinPageSize || currentPageSize > PaginationValidators.MaxPageSize)
            {
                return BadRequest(new { error = $"PageSize must be between {PaginationValidators.MinPageSize} and {PaginationValidators.MaxPageSize}." });
            }

            var pagedResult = await proposalService.GetByOrganizationAsync(organizationId, currentPage, currentPageSize, status, search, cancellationToken);
            return Ok(pagedResult);
        }

        // Legacy endpoint - return all proposals without pagination
        var proposals = await proposalService.GetByOrganizationAsync(organizationId, cancellationToken);
        return Ok(proposals);
    }
}
