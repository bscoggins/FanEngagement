using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.Persistence.Migrations;

/// <summary>
/// Migration helper to encrypt existing plaintext webhook secrets.
/// This should be run after the EncryptWebhookSecrets migration has been applied.
/// </summary>
public static class WebhookSecretEncryptionMigration
{
    /// <summary>
    /// Encrypts all webhook secrets that are marked with the NEEDS_ENCRYPTION prefix.
    /// </summary>
    public static async Task EncryptExistingSecretsAsync(
        FanEngagementDbContext dbContext,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var keyString = configuration["Encryption:Key"];
        if (string.IsNullOrWhiteSpace(keyString))
        {
            logger.LogWarning("Encryption key not configured. Skipping webhook secret encryption migration.");
            return;
        }

        var key = Convert.FromBase64String(keyString);
        if (key.Length != 32)
        {
            logger.LogError("Encryption key must be 32 bytes (256 bits). Skipping webhook secret encryption migration.");
            return;
        }

        // Find webhooks that need encryption
        var webhooks = await dbContext.WebhookEndpoints
            .Where(w => w.EncryptedSecret.StartsWith("NEEDS_ENCRYPTION:"))
            .ToListAsync(cancellationToken);

        if (webhooks.Count == 0)
        {
            logger.LogInformation("No webhook secrets need encryption.");
            return;
        }

        logger.LogInformation("Encrypting {Count} webhook secrets...", webhooks.Count);

        foreach (var webhook in webhooks)
        {
            try
            {
                // Extract the plaintext secret
                var plaintext = webhook.EncryptedSecret.Substring("NEEDS_ENCRYPTION:".Length);
                
                // Encrypt it
                var encrypted = EncryptSecret(plaintext, key);
                
                // Update the webhook
                webhook.EncryptedSecret = encrypted;
                
                logger.LogDebug("Encrypted secret for webhook {WebhookId}", webhook.Id);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to encrypt secret for webhook {WebhookId}", webhook.Id);
                throw;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Successfully encrypted {Count} webhook secrets.", webhooks.Count);
    }

    private static string EncryptSecret(string plaintext, byte[] key)
    {
        const int NonceSize = 12;
        const int TagSize = 16;

        var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        
        // Generate random nonce
        var nonce = new byte[NonceSize];
        RandomNumberGenerator.Fill(nonce);
        
        // Allocate space for ciphertext and tag
        var ciphertext = new byte[plaintextBytes.Length];
        var tag = new byte[TagSize];
        
        using var aesGcm = new AesGcm(key, TagSize);
        aesGcm.Encrypt(nonce, plaintextBytes, ciphertext, tag);
        
        // Combine: nonce + ciphertext + tag
        var result = new byte[NonceSize + ciphertext.Length + TagSize];
        Buffer.BlockCopy(nonce, 0, result, 0, NonceSize);
        Buffer.BlockCopy(ciphertext, 0, result, NonceSize, ciphertext.Length);
        Buffer.BlockCopy(tag, 0, result, NonceSize + ciphertext.Length, TagSize);
        
        return Convert.ToBase64String(result);
    }
}
