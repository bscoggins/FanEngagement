using System.ComponentModel.DataAnnotations;

namespace FanEngagement.Application.Users;

public class SetPasswordRequest
{
    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}
