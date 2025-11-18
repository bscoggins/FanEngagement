using FanEngagement.Application.Proposals;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("proposals")]
public class ProposalsController(IProposalService proposalService) : ControllerBase
{
    [HttpGet("{proposalId:guid}", Name = "GetProposalById")]
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
    public async Task<ActionResult> Update(Guid proposalId, [FromBody] UpdateProposalRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var proposal = await proposalService.UpdateAsync(proposalId, request, cancellationToken);
            if (proposal is null)
            {
                return NotFound();
            }

            return Ok(proposal);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{proposalId:guid}/close")]
    public async Task<ActionResult> Close(Guid proposalId, CancellationToken cancellationToken)
    {
        try
        {
            var proposal = await proposalService.CloseAsync(proposalId, cancellationToken);
            if (proposal is null)
            {
                return NotFound();
            }

            return Ok(proposal);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{proposalId:guid}/options")]
    public async Task<ActionResult> AddOption(Guid proposalId, [FromBody] AddProposalOptionRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var option = await proposalService.AddOptionAsync(proposalId, request, cancellationToken);
            if (option is null)
            {
                return NotFound();
            }

            return CreatedAtAction(nameof(GetById), new { proposalId }, option);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{proposalId:guid}/options/{optionId:guid}")]
    public async Task<ActionResult> DeleteOption(Guid proposalId, Guid optionId, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await proposalService.DeleteOptionAsync(proposalId, optionId, cancellationToken);
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{proposalId:guid}/votes")]
    public async Task<ActionResult> CastVote(Guid proposalId, [FromBody] CastVoteRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var vote = await proposalService.CastVoteAsync(proposalId, request, cancellationToken);
            if (vote is null)
            {
                return NotFound();
            }

            return Created($"/proposals/{proposalId}/votes/{vote.Id}", vote);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{proposalId:guid}/results")]
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
