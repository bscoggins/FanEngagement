namespace FanEngagement.Application.Proposals;

/// <summary>
/// Proposal DTO with organization information for global search results.
/// Used by Platform Admins to search proposals across all organizations.
/// </summary>
public class ProposalWithOrganizationDto : ProposalDto
{
    /// <summary>
    /// Name of the organization this proposal belongs to.
    /// </summary>
    public string OrganizationName { get; set; } = string.Empty;
}
