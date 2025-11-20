using System.ComponentModel.DataAnnotations;

namespace FanEngagement.Application.Organizations;

public class UpdateOrganizationRequest
{
    [Required]
    [MinLength(1)]
    public string Name { get; set; } = string.Empty;
    
    public string? Description { get; set; }
}
