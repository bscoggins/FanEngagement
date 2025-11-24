using FanEngagement.Application.Proposals;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("proposals")]
[Authorize]
public class ProposalsController(IProposalService proposalService) : ControllerBase
{
    [HttpGet("{proposalId:guid}", Name = "GetProposalById")]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult> GetById(Guid proposalId, CancellationToken cancellationToken)
    {
        var proposal = await proposalService.GetByIdAsync(proposalId, cancellationToken);
        if (proposal is null)
        {
            return NotFound();
        }

        return Ok(proposal);
    }

    [HttpPut("{proposalId:guid}")]
    [Authorize(Policy = "ProposalManager")]
    public async Task<ActionResult> Update(Guid proposalId, [FromBody] UpdateProposalRequest request, CancellationToken cancellationToken)
    {
        var proposal = await proposalService.UpdateAsync(proposalId, request, cancellationToken);
        if (proposal is null)
        {
            return NotFound();
        }

        return Ok(proposal);
    }

    [HttpPost("{proposalId:guid}/open")]
    [Authorize(Policy = "ProposalManager")]
    public async Task<ActionResult> Open(Guid proposalId, CancellationToken cancellationToken)
    {
        var proposal = await proposalService.OpenAsync(proposalId, cancellationToken);
        if (proposal is null)
        {
            return NotFound();
        }

        return Ok(proposal);
    }

    [HttpPost("{proposalId:guid}/close")]
    [Authorize(Policy = "ProposalManager")]
    public async Task<ActionResult> Close(Guid proposalId, CancellationToken cancellationToken)
    {
        var proposal = await proposalService.CloseAsync(proposalId, cancellationToken);
        if (proposal is null)
        {
            return NotFound();
        }

        return Ok(proposal);
    }

    [HttpPost("{proposalId:guid}/finalize")]
    [Authorize(Policy = "ProposalManager")]
    public async Task<ActionResult> Finalize(Guid proposalId, CancellationToken cancellationToken)
    {
        var proposal = await proposalService.FinalizeAsync(proposalId, cancellationToken);
        if (proposal is null)
        {
            return NotFound();
        }

        return Ok(proposal);
    }

    [HttpPost("{proposalId:guid}/options")]
    [Authorize(Policy = "ProposalManager")]
    public async Task<ActionResult> AddOption(Guid proposalId, [FromBody] AddProposalOptionRequest request, CancellationToken cancellationToken)
    {
        var option = await proposalService.AddOptionAsync(proposalId, request, cancellationToken);
        if (option is null)
        {
            return NotFound();
        }

        return CreatedAtAction(nameof(GetById), new { proposalId }, option);
    }

    [HttpDelete("{proposalId:guid}/options/{optionId:guid}")]
    [Authorize(Policy = "ProposalManager")]
    public async Task<ActionResult> DeleteOption(Guid proposalId, Guid optionId, CancellationToken cancellationToken)
    {
        var deleted = await proposalService.DeleteOptionAsync(proposalId, optionId, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpPost("{proposalId:guid}/votes")]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult> CastVote(Guid proposalId, [FromBody] CastVoteRequest request, CancellationToken cancellationToken)
    {
        var vote = await proposalService.CastVoteAsync(proposalId, request, cancellationToken);
        if (vote is null)
        {
            return NotFound();
        }

        return Created($"/proposals/{proposalId}/votes/{vote.Id}", vote);
    }

    [HttpGet("{proposalId:guid}/votes/{userId:guid}")]
    [Authorize]
    public async Task<ActionResult> GetUserVote(Guid proposalId, Guid userId, CancellationToken cancellationToken)
    {
        // Only allow access if the requesting user is the target user or has Admin role
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var requestingUserId))
        {
            return Forbid();
        }

        // Allow if user is viewing their own vote or is an Admin
        if (requestingUserId != userId && !User.IsInRole("Admin"))
        {
            return Forbid();
        }

        var vote = await proposalService.GetUserVoteAsync(proposalId, userId, cancellationToken);
        if (vote is null)
        {
            return NotFound();
        }

        return Ok(vote);
    }

    [HttpGet("{proposalId:guid}/results")]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult> GetResults(Guid proposalId, CancellationToken cancellationToken)
    {
        var results = await proposalService.GetResultsAsync(proposalId, cancellationToken);
        if (results is null)
        {
            return NotFound();
        }

        return Ok(results);
    }
}
