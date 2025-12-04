namespace FanEngagement.Application.Mfa;

public interface IMfaService
{
    /// <summary>
    /// Generates a new MFA secret and QR code URI for initial setup.
    /// </summary>
    MfaSetupResult GenerateSetup(Guid userId, string email);
    
    /// <summary>
    /// Validates a TOTP code against the user's stored secret.
    /// </summary>
    bool ValidateTotp(string secret, string code);
    
    /// <summary>
    /// Generates backup codes for recovery.
    /// </summary>
    string[] GenerateBackupCodes();
    
    /// <summary>
    /// Hashes backup codes for secure storage.
    /// </summary>
    string HashBackupCodes(string[] backupCodes);
    
    /// <summary>
    /// Validates a backup code against the hashed version.
    /// </summary>
    bool ValidateBackupCode(string hashedBackupCodes, string code);
}
