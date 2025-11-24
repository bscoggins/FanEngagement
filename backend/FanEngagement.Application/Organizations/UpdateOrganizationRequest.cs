using System.ComponentModel.DataAnnotations;

namespace FanEngagement.Application.Organizations;

public class UpdateOrganizationRequest
{
    [Required]
    [MinLength(1)]
    public string Name { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? PrimaryColor { get; set; }
    public string? SecondaryColor { get; set; }
}
