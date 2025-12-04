namespace FanEngagement.Application.Mfa;

public class MfaSetupResult
{
    public string SecretKey { get; set; } = default!;
    public string QrCodeUri { get; set; } = default!;
    public string[] BackupCodes { get; set; } = default!;
}
