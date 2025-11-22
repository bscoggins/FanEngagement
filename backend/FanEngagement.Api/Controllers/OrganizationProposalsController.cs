using FanEngagement.Application.Proposals;
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
        try
        {
            var proposal = await proposalService.CreateAsync(organizationId, request, cancellationToken);
            return CreatedAtRoute("GetProposalById", new { proposalId = proposal.Id }, proposal);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [HttpGet]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult> GetByOrganization(Guid organizationId, CancellationToken cancellationToken)
    {
        var proposals = await proposalService.GetByOrganizationAsync(organizationId, cancellationToken);
        return Ok(proposals);
    }
}
