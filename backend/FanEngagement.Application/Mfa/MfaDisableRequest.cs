using System.ComponentModel.DataAnnotations;

namespace FanEngagement.Application.Mfa;

public class MfaDisableRequest
{
    [Required]
    public string Code { get; set; } = default!;
}
