using FanEngagement.Application.Organizations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("organizations")]
[Authorize]
public class OrganizationsController(IOrganizationService organizationService) : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult> Create([FromBody] CreateOrganizationRequest request, CancellationToken cancellationToken)
    {
        var organization = await organizationService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = organization.Id }, organization);
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult> GetAll(CancellationToken cancellationToken)
    {
        var organizations = await organizationService.GetAllAsync(cancellationToken);
        return Ok(organizations);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var organization = await organizationService.GetByIdAsync(id, cancellationToken);
        if (organization is null)
        {
            return NotFound();
        }

        return Ok(organization);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "OrgAdmin")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateOrganizationRequest request, CancellationToken cancellationToken)
    {
        var organization = await organizationService.UpdateAsync(id, request, cancellationToken);
        if (organization is null)
        {
            return NotFound();
        }

        return Ok(organization);
    }
}
