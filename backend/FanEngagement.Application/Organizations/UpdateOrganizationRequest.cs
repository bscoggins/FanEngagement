namespace FanEngagement.Application.Organizations;

public class UpdateOrganizationRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
