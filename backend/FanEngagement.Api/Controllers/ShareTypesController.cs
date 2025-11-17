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
}
