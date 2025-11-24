using System.ComponentModel.DataAnnotations;
using FanEngagement.Domain.Enums;

namespace FanEngagement.Domain.Entities;

public class OutboundEvent
{
    public Guid Id { get; set; }
    
    public Guid OrganizationId { get; set; }
    
    public Guid? WebhookEndpointId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string EventType { get; set; } = default!;
    
    [Required]
    public string Payload { get; set; } = default!;
    
    public OutboundEventStatus Status { get; set; }
    
    public int AttemptCount { get; set; }
    
    public DateTimeOffset? LastAttemptAt { get; set; }
    
    [MaxLength(1000)]
    public string? LastError { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; }

    public Organization? Organization { get; set; }
    public WebhookEndpoint? WebhookEndpoint { get; set; }
}
