using FanEngagement.Application.Common;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Validators;
using FanEngagement.Api.Helpers;
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
        // Get the current user ID from claims
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var creatorUserId))
        {
            return Unauthorized();
        }

        var organization = await organizationService.CreateAsync(request, creatorUserId, cancellationToken);
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
            var validationError = PaginationHelper.ValidatePaginationParameters(currentPage, currentPageSize);
            if (validationError != null)
            {
                return validationError;
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
