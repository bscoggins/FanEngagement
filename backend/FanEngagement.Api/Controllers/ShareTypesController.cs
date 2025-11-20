using FanEngagement.Application.ShareTypes;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("organizations/{organizationId:guid}/share-types")]
public class ShareTypesController(IShareTypeService shareTypeService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult> Create(Guid organizationId, [FromBody] CreateShareTypeRequest request, CancellationToken cancellationToken)
    {
        var shareType = await shareTypeService.CreateAsync(organizationId, request, cancellationToken);
        return CreatedAtAction(nameof(GetByOrganization), new { organizationId }, shareType);
    }

    [HttpGet]
    public async Task<ActionResult> GetByOrganization(Guid organizationId, CancellationToken cancellationToken)
    {
        var shareTypes = await shareTypeService.GetByOrganizationAsync(organizationId, cancellationToken);
        return Ok(shareTypes);
    }

    [HttpGet("{id:guid}")]
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
    public async Task<ActionResult> Update(Guid organizationId, Guid id, [FromBody] UpdateShareTypeRequest request, CancellationToken cancellationToken)
    {
        // Verify the share type exists and belongs to the organization
        var existing = await shareTypeService.GetByIdAsync(id, cancellationToken);
        if (existing is null || existing.OrganizationId != organizationId)
        {
            return NotFound();
        }

        var shareType = await shareTypeService.UpdateAsync(id, request, cancellationToken);
        if (shareType is null)
        {
            return NotFound();
        }

        return Ok(shareType);
    }
}
