using FanEngagement.Application.ShareIssuances;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("organizations/{organizationId:guid}")]
[Authorize]
public class ShareIssuancesController(IShareIssuanceService shareIssuanceService) : ControllerBase
{
    [HttpPost("share-issuances")]
    [Authorize(Policy = "OrgAdmin")]
    public async Task<ActionResult<ShareIssuanceDto>> Create(
        Guid organizationId,
        [FromBody] CreateShareIssuanceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var issuance = await shareIssuanceService.CreateAsync(organizationId, request, cancellationToken);
            return CreatedAtAction(nameof(GetByOrganization), new { organizationId }, issuance);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [HttpGet("share-issuances")]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult<IReadOnlyList<ShareIssuanceDto>>> GetByOrganization(
        Guid organizationId,
        CancellationToken cancellationToken)
    {
        var issuances = await shareIssuanceService.GetByOrganizationAsync(organizationId, cancellationToken);
        return Ok(issuances);
    }

    [HttpGet("users/{userId:guid}/share-issuances")]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult<IReadOnlyList<ShareIssuanceDto>>> GetByUser(
        Guid organizationId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var issuances = await shareIssuanceService.GetByUserAsync(organizationId, userId, cancellationToken);
        return Ok(issuances);
    }
}

[ApiController]
[Route("organizations/{organizationId:guid}/users/{userId:guid}/balances")]
[Authorize(Policy = "OrgMember")]
public class ShareBalancesController(IShareIssuanceService shareIssuanceService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ShareBalanceDto>>> GetBalances(
        Guid organizationId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var balances = await shareIssuanceService.GetBalancesByUserAsync(organizationId, userId, cancellationToken);
        return Ok(balances);
    }
}
