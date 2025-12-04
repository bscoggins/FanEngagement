namespace FanEngagement.Application.Encryption;

/// <summary>
/// Service for encrypting and decrypting sensitive data.
/// </summary>
public interface IEncryptionService
{
    /// <summary>
    /// Encrypts plaintext data.
    /// </summary>
    /// <param name="plaintext">The plaintext string to encrypt.</param>
    /// <returns>Base64-encoded encrypted data with nonce prepended.</returns>
    string Encrypt(string plaintext);

    /// <summary>
    /// Decrypts encrypted data.
    /// </summary>
    /// <param name="ciphertext">Base64-encoded encrypted data with nonce prepended.</param>
    /// <returns>The decrypted plaintext string.</returns>
    string Decrypt(string ciphertext);
}
