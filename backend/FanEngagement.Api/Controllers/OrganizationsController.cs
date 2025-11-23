using FanEngagement.Application.Common;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Validators;
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
    public async Task<ActionResult> GetAll(
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        // If pagination parameters are provided, use paginated endpoint
        if (page.HasValue || pageSize.HasValue || !string.IsNullOrWhiteSpace(search))
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

            var pagedResult = await organizationService.GetAllAsync(currentPage, currentPageSize, search, cancellationToken);
            return Ok(pagedResult);
        }

        // Legacy endpoint - return all organizations without pagination
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
