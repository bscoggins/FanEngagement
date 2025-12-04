using System.ComponentModel.DataAnnotations;

namespace FanEngagement.Application.Mfa;

public class MfaValidateRequest
{
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    public string Code { get; set; } = default!;
}
