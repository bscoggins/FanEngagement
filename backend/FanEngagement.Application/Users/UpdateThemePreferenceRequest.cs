using System.ComponentModel.DataAnnotations;
using FanEngagement.Domain.Enums;

namespace FanEngagement.Application.Users;

public class UpdateThemePreferenceRequest
{
    [Required]
    public UserThemePreference ThemePreference { get; set; } = UserThemePreference.Light;
}
