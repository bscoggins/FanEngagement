using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Authentication;

public class LoginResponse
{
    public string Token { get; set; } = default!;
    public Guid UserId { get; set; }
    public string Email { get; set; } = default!;
    public string DisplayName { get; set; } = default!;
    public string Role { get; set; } = default!;
    public bool MfaRequired { get; set; }
    public UserThemePreference ThemePreference { get; set; } = UserThemePreference.Light;
}
