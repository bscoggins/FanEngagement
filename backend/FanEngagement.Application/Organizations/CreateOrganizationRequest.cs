namespace FanEngagement.Application.Organizations;

public class CreateOrganizationRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
