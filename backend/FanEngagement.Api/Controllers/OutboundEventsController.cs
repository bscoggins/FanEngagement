using FanEngagement.Application.OutboundEvents;
using FanEngagement.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("organizations/{organizationId:guid}/outbound-events")]
public class OutboundEventsController(IOutboundEventService outboundEventService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OutboundEventDto>>> GetAll(
        Guid organizationId,
        [FromQuery] OutboundEventStatus? status = null,
        [FromQuery] string? eventType = null,
        CancellationToken cancellationToken = default)
    {
        var events = await outboundEventService.GetAllAsync(organizationId, status, eventType, cancellationToken);
        return Ok(events);
    }

    [HttpGet("{eventId:guid}")]
    public async Task<ActionResult<OutboundEventDetailsDto>> GetById(
        Guid organizationId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        var outboundEvent = await outboundEventService.GetByIdAsync(organizationId, eventId, cancellationToken);
        if (outboundEvent is null)
        {
            return NotFound();
        }

        return Ok(outboundEvent);
    }

    [HttpPost("{eventId:guid}/retry")]
    public async Task<ActionResult> Retry(
        Guid organizationId,
        Guid eventId,
        CancellationToken cancellationToken)
    {
        var retried = await outboundEventService.RetryAsync(organizationId, eventId, cancellationToken);
        if (!retried)
        {
            return NotFound();
        }

        return NoContent();
    }
}
