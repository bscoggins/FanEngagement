using System.ComponentModel.DataAnnotations;

namespace FanEngagement.Application.Authentication;

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = default!;
    
    [Required]
    public string Password { get; set; } = default!;
}
