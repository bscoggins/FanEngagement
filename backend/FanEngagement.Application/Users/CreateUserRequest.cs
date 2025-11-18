using System.ComponentModel.DataAnnotations;

namespace FanEngagement.Application.Users;

public class CreateUserRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(1)]
    public string DisplayName { get; set; } = string.Empty;
}
