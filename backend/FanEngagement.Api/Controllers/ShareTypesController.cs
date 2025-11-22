using FanEngagement.Application.ShareTypes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("organizations/{organizationId:guid}/share-types")]
[Authorize]
public class ShareTypesController(IShareTypeService shareTypeService) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = "OrgAdmin")]
    public async Task<ActionResult> Create(Guid organizationId, [FromBody] CreateShareTypeRequest request, CancellationToken cancellationToken)
    {
        var shareType = await shareTypeService.CreateAsync(organizationId, request, cancellationToken);
        return CreatedAtAction(nameof(GetByOrganization), new { organizationId }, shareType);
    }

    [HttpGet]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult> GetByOrganization(Guid organizationId, CancellationToken cancellationToken)
    {
        var shareTypes = await shareTypeService.GetByOrganizationAsync(organizationId, cancellationToken);
        return Ok(shareTypes);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult> GetById(Guid organizationId, Guid id, CancellationToken cancellationToken)
    {
        var shareType = await shareTypeService.GetByIdAsync(id, cancellationToken);
        if (shareType is null || shareType.OrganizationId != organizationId)
        {
            return NotFound();
        }

        return Ok(shareType);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "OrgAdmin")]
    public async Task<ActionResult> Update(Guid organizationId, Guid id, [FromBody] UpdateShareTypeRequest request, CancellationToken cancellationToken)
    {
        var shareType = await shareTypeService.UpdateAsync(organizationId, id, request, cancellationToken);
        if (shareType is null)
        {
            return NotFound();
        }

        return Ok(shareType);
    }
}
