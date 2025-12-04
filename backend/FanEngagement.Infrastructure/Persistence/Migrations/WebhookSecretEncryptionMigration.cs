using FanEngagement.Application.Encryption;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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

        // Create an encryption service instance for the migration
        var encryptionService = new Services.AesEncryptionService(
            configuration,
            Microsoft.Extensions.Logging.Abstractions.NullLogger<Services.AesEncryptionService>.Instance);

        foreach (var webhook in webhooks)
        {
            try
            {
                // Extract the plaintext secret
                var plaintext = webhook.EncryptedSecret.Substring("NEEDS_ENCRYPTION:".Length);
                
                // Encrypt it using the encryption service
                var encrypted = encryptionService.Encrypt(plaintext);
                
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
}
