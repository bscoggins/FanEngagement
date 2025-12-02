using FanEngagement.Application.WebhookEndpoints;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("organizations/{organizationId:guid}/webhooks")]
[Authorize(Policy = "OrgAdmin")]
public class WebhookEndpointsController(IWebhookEndpointService webhookEndpointService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<WebhookEndpointDto>> Create(
        Guid organizationId,
        [FromBody] CreateWebhookEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var actorUserId = GetCurrentUserId();
        var webhook = await webhookEndpointService.CreateAsync(organizationId, request, actorUserId, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { organizationId, webhookId = webhook.Id }, webhook);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WebhookEndpointDto>>> GetAll(
        Guid organizationId,
        CancellationToken cancellationToken)
    {
        var webhooks = await webhookEndpointService.GetAllAsync(organizationId, cancellationToken);
        return Ok(webhooks);
    }

    [HttpGet("{webhookId:guid}")]
    public async Task<ActionResult<WebhookEndpointDto>> GetById(
        Guid organizationId,
        Guid webhookId,
        CancellationToken cancellationToken)
    {
        var webhook = await webhookEndpointService.GetByIdAsync(organizationId, webhookId, cancellationToken);
        if (webhook is null)
        {
            return NotFound();
        }

        return Ok(webhook);
    }

    [HttpPut("{webhookId:guid}")]
    public async Task<ActionResult<WebhookEndpointDto>> Update(
        Guid organizationId,
        Guid webhookId,
        [FromBody] UpdateWebhookEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var actorUserId = GetCurrentUserId();
        var webhook = await webhookEndpointService.UpdateAsync(organizationId, webhookId, request, actorUserId, cancellationToken);
        if (webhook is null)
        {
            return NotFound();
        }

        return Ok(webhook);
    }

    [HttpDelete("{webhookId:guid}")]
    public async Task<ActionResult> Delete(
        Guid organizationId,
        Guid webhookId,
        CancellationToken cancellationToken)
    {
        var actorUserId = GetCurrentUserId();
        var deleted = await webhookEndpointService.DeleteAsync(organizationId, webhookId, actorUserId, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return null;
        }
        return userId;
    }
}
