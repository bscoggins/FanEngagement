using System.ComponentModel.DataAnnotations;

namespace FanEngagement.Application.Users;

public class UpdateUserRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    public string DisplayName { get; set; } = string.Empty;
}
