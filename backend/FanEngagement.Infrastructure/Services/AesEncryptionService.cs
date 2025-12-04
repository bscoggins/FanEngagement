using System.Security.Cryptography;
using System.Text;
using FanEngagement.Application.Encryption;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.Services;

/// <summary>
/// AES-256-GCM encryption service for sensitive data.
/// Uses AES in GCM mode for authenticated encryption.
/// </summary>
public class AesEncryptionService(
    IConfiguration configuration,
    ILogger<AesEncryptionService> logger) : IEncryptionService
{
    private readonly byte[] _key = InitializeKey(configuration, logger);
    private const int NonceSize = 12; // 96 bits for GCM
    private const int TagSize = 16; // 128 bits for authentication tag

    /// <summary>
    /// Initializes and validates the encryption key from configuration.
    /// </summary>
    private static byte[] InitializeKey(IConfiguration configuration, ILogger<AesEncryptionService> logger)
    {
        var keyString = configuration["Encryption:Key"];
        
        if (string.IsNullOrWhiteSpace(keyString))
        {
            throw new InvalidOperationException(
                "Encryption key is not configured. Please set Encryption:Key in appsettings.json or environment variables. " +
                "Generate a key with: openssl rand -base64 32");
        }

        try
        {
            var key = Convert.FromBase64String(keyString);
            
            if (key.Length != 32)
            {
                throw new InvalidOperationException(
                    $"Encryption key must be 32 bytes (256 bits) for AES-256. Current key is {key.Length} bytes. " +
                    "Generate a key with: openssl rand -base64 32");
            }

            logger.LogInformation("Encryption service initialized with AES-256-GCM");
            return key;
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException(
                "Encryption key must be a valid Base64-encoded string. " +
                "Generate a key with: openssl rand -base64 32", ex);
        }
    }

    /// <summary>
    /// Encrypts plaintext using AES-256-GCM.
    /// </summary>
    /// <param name="plaintext">The plaintext to encrypt.</param>
    /// <returns>Base64-encoded string containing nonce + ciphertext + tag.</returns>
    public string Encrypt(string plaintext)
    {
        if (string.IsNullOrEmpty(plaintext))
        {
            throw new ArgumentException("Plaintext cannot be null or empty.", nameof(plaintext));
        }

        var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        
        // Generate random nonce
        var nonce = new byte[NonceSize];
        RandomNumberGenerator.Fill(nonce);
        
        // Allocate space for ciphertext and tag
        var ciphertext = new byte[plaintextBytes.Length];
        var tag = new byte[TagSize];
        
        using var aesGcm = new AesGcm(_key, TagSize);
        aesGcm.Encrypt(nonce, plaintextBytes, ciphertext, tag);
        
        // Combine: nonce + ciphertext + tag
        var result = new byte[NonceSize + ciphertext.Length + TagSize];
        Buffer.BlockCopy(nonce, 0, result, 0, NonceSize);
        Buffer.BlockCopy(ciphertext, 0, result, NonceSize, ciphertext.Length);
        Buffer.BlockCopy(tag, 0, result, NonceSize + ciphertext.Length, TagSize);
        
        return Convert.ToBase64String(result);
    }

    /// <summary>
    /// Decrypts ciphertext using AES-256-GCM.
    /// </summary>
    /// <param name="ciphertext">Base64-encoded string containing nonce + ciphertext + tag.</param>
    /// <returns>The decrypted plaintext.</returns>
    public string Decrypt(string ciphertext)
    {
        if (string.IsNullOrEmpty(ciphertext))
        {
            throw new ArgumentException("Ciphertext cannot be null or empty.", nameof(ciphertext));
        }

        try
        {
            var encryptedData = Convert.FromBase64String(ciphertext);
            
            if (encryptedData.Length < NonceSize + TagSize)
            {
                throw new CryptographicException("Invalid ciphertext format: too short.");
            }
            
            // Extract components
            var nonce = new byte[NonceSize];
            var tag = new byte[TagSize];
            var encryptedBytes = new byte[encryptedData.Length - NonceSize - TagSize];
            
            Buffer.BlockCopy(encryptedData, 0, nonce, 0, NonceSize);
            Buffer.BlockCopy(encryptedData, NonceSize, encryptedBytes, 0, encryptedBytes.Length);
            Buffer.BlockCopy(encryptedData, NonceSize + encryptedBytes.Length, tag, 0, TagSize);
            
            // Decrypt
            var decryptedBytes = new byte[encryptedBytes.Length];
            using var aesGcm = new AesGcm(_key, TagSize);
            aesGcm.Decrypt(nonce, encryptedBytes, tag, decryptedBytes);
            
            return Encoding.UTF8.GetString(decryptedBytes);
        }
        catch (FormatException ex)
        {
            logger.LogError(ex, "Failed to decrypt: invalid Base64 format");
            throw new CryptographicException("Failed to decrypt: invalid ciphertext format.", ex);
        }
        catch (CryptographicException ex)
        {
            logger.LogError(ex, "Failed to decrypt: authentication failed or corrupted data");
            throw new CryptographicException("Failed to decrypt: authentication failed or corrupted data.", ex);
        }
    }
}
