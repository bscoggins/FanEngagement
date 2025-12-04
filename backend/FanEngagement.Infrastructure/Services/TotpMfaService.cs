using System.Security.Cryptography;
using FanEngagement.Application.Mfa;
using Microsoft.Extensions.Logging;
using OtpNet;

namespace FanEngagement.Infrastructure.Services;

public class TotpMfaService(ILogger<TotpMfaService> logger) : IMfaService
{
    private const string Issuer = "FanEngagement";
    private const int BackupCodeLength = 8;
    private const int BackupCodeCount = 10;
    
    public MfaSetupResult GenerateSetup(Guid userId, string email)
    {
        // Generate a random secret key (20 bytes = 160 bits)
        var secretKey = KeyGeneration.GenerateRandomKey(20);
        var base32Secret = Base32Encoding.ToString(secretKey);
        
        // Create OTP Auth URI for QR code
        var uri = $"otpauth://totp/{Issuer}:{email}?secret={base32Secret}&issuer={Issuer}";
        
        // Generate backup codes
        var backupCodes = GenerateBackupCodes();
        
        return new MfaSetupResult
        {
            SecretKey = base32Secret,
            QrCodeUri = uri,
            BackupCodes = backupCodes
        };
    }
    
    public bool ValidateTotp(string secret, string code)
    {
        try
        {
            // Remove any spaces from the code
            code = code.Replace(" ", "").Trim();
            
            if (string.IsNullOrWhiteSpace(code) || code.Length != 6)
            {
                return false;
            }
            
            var secretBytes = Base32Encoding.ToBytes(secret);
            var totp = new Totp(secretBytes);
            
            // Allow a time window of +/- 1 step (30 seconds each) to account for clock drift
            return totp.VerifyTotp(code, out _, new VerificationWindow(1, 1));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "TOTP validation failed for secret");
            return false;
        }
    }
    
    public string[] GenerateBackupCodes()
    {
        var backupCodes = new string[BackupCodeCount];
        
        for (int i = 0; i < BackupCodeCount; i++)
        {
            backupCodes[i] = GenerateBackupCode();
        }
        
        return backupCodes;
    }
    
    public string HashBackupCodes(string[] backupCodes)
    {
        // Store backup codes as a comma-separated list of hashed values
        var hashedCodes = backupCodes.Select(code => HashSingleBackupCode(code));
        return string.Join(",", hashedCodes);
    }
    
    public bool ValidateBackupCode(string hashedBackupCodes, string code)
    {
        try
        {
            // Remove any spaces from the code
            code = code.Replace(" ", "").Replace("-", "").Trim();
            
            if (string.IsNullOrWhiteSpace(hashedBackupCodes))
            {
                return false;
            }
            
            var hashedCodeList = hashedBackupCodes.Split(',', StringSplitOptions.RemoveEmptyEntries);
            var inputHash = HashSingleBackupCode(code);
            
            // Check if the hashed code exists in the list
            return hashedCodeList.Contains(inputHash);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Backup code validation failed");
            return false;
        }
    }
    
    private static string GenerateBackupCode()
    {
        // Generate a random 8-character alphanumeric backup code
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var code = new char[BackupCodeLength];
        
        for (int i = 0; i < BackupCodeLength; i++)
        {
            code[i] = chars[RandomNumberGenerator.GetInt32(chars.Length)];
        }
        
        return new string(code);
    }
    
    private static string HashSingleBackupCode(string code)
    {
        // Use SHA256 for hashing backup codes
        var bytes = System.Text.Encoding.UTF8.GetBytes(code);
        var hash = SHA256.HashData(bytes);
        return Convert.ToBase64String(hash);
    }
}
