using FanEngagement.Application.WebhookEndpoints;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
        try
        {
            var webhook = await webhookEndpointService.CreateAsync(organizationId, request, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { organizationId, webhookId = webhook.Id }, webhook);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
        {
            return NotFound(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
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
        try
        {
            var webhook = await webhookEndpointService.UpdateAsync(organizationId, webhookId, request, cancellationToken);
            if (webhook is null)
            {
                return NotFound();
            }

            return Ok(webhook);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{webhookId:guid}")]
    public async Task<ActionResult> Delete(
        Guid organizationId,
        Guid webhookId,
        CancellationToken cancellationToken)
    {
        var deleted = await webhookEndpointService.DeleteAsync(organizationId, webhookId, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}
