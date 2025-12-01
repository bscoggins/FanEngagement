namespace FanEngagement.Application.Authentication;

/// <summary>
/// Context information for authentication audit logging.
/// Contains client details without sensitive credentials.
/// </summary>
public class AuthenticationAuditContext
{
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}
