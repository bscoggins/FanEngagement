using System.ComponentModel.DataAnnotations;

namespace FanEngagement.Domain.Entities;

public class WebhookEndpoint
{
    public Guid Id { get; set; }
    
    public Guid OrganizationId { get; set; }
    
    [Required]
    [MaxLength(2000)]
    public string Url { get; set; } = default!;
    
    [Required]
    [MaxLength(500)]
    public string Secret { get; set; } = default!;
    
    [Required]
    public string SubscribedEvents { get; set; } = default!;
    
    public bool IsActive { get; set; }
    
    public DateTimeOffset CreatedAt { get; set; }

    public Organization? Organization { get; set; }
    public ICollection<OutboundEvent> OutboundEvents { get; set; } = new List<OutboundEvent>();
}
