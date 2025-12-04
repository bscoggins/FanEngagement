using System.ComponentModel.DataAnnotations;

namespace FanEngagement.Application.Mfa;

public class MfaEnableRequest
{
    [Required]
    public string SecretKey { get; set; } = default!;
    
    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string TotpCode { get; set; } = default!;
}
