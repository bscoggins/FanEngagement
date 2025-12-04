using System.Security.Cryptography;
using FanEngagement.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace FanEngagement.Tests;

public class AesEncryptionServiceTests
{
    private readonly IConfiguration _configuration;

    public AesEncryptionServiceTests()
    {
        // Generate a valid 32-byte key for testing
        var key = new byte[32];
        RandomNumberGenerator.Fill(key);
        var keyBase64 = Convert.ToBase64String(key);

        var configDict = new Dictionary<string, string?>
        {
            ["Encryption:Key"] = keyBase64
        };
        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configDict)
            .Build();
    }

    [Fact]
    public void Encrypt_ReturnsValidBase64String()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);
        var plaintext = "my-webhook-secret-123";

        // Act
        var encrypted = service.Encrypt(plaintext);

        // Assert
        Assert.NotNull(encrypted);
        Assert.NotEmpty(encrypted);
        
        // Verify it's valid Base64
        var bytes = Convert.FromBase64String(encrypted);
        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 0);
    }

    [Fact]
    public void Decrypt_ReturnsOriginalPlaintext()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);
        var plaintext = "my-webhook-secret-123";

        // Act
        var encrypted = service.Encrypt(plaintext);
        var decrypted = service.Decrypt(encrypted);

        // Assert
        Assert.Equal(plaintext, decrypted);
    }

    [Fact]
    public void EncryptDecrypt_Roundtrip_WithSpecialCharacters()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);
        var plaintext = "Secret!@#$%^&*()_+-=[]{}|;':\",./<>?`~";

        // Act
        var encrypted = service.Encrypt(plaintext);
        var decrypted = service.Decrypt(encrypted);

        // Assert
        Assert.Equal(plaintext, decrypted);
    }

    [Fact]
    public void EncryptDecrypt_Roundtrip_WithUnicodeCharacters()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);
        var plaintext = "Secret-🔐-密钥-مفتاح";

        // Act
        var encrypted = service.Encrypt(plaintext);
        var decrypted = service.Decrypt(encrypted);

        // Assert
        Assert.Equal(plaintext, decrypted);
    }

    [Fact]
    public void Encrypt_ProducesDifferentCiphertextForSamePlaintext()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);
        var plaintext = "my-webhook-secret";

        // Act
        var encrypted1 = service.Encrypt(plaintext);
        var encrypted2 = service.Encrypt(plaintext);

        // Assert - Due to random nonce, ciphertexts should be different
        Assert.NotEqual(encrypted1, encrypted2);
        
        // But both should decrypt to the same plaintext
        Assert.Equal(plaintext, service.Decrypt(encrypted1));
        Assert.Equal(plaintext, service.Decrypt(encrypted2));
    }

    [Fact]
    public void Encrypt_ThrowsException_WhenPlaintextIsNull()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);

        // Act & Assert
        Assert.Throws<ArgumentException>(() => service.Encrypt(null!));
    }

    [Fact]
    public void Encrypt_ThrowsException_WhenPlaintextIsEmpty()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);

        // Act & Assert
        Assert.Throws<ArgumentException>(() => service.Encrypt(string.Empty));
    }

    [Fact]
    public void Decrypt_ThrowsException_WhenCiphertextIsNull()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);

        // Act & Assert
        Assert.Throws<ArgumentException>(() => service.Decrypt(null!));
    }

    [Fact]
    public void Decrypt_ThrowsException_WhenCiphertextIsEmpty()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);

        // Act & Assert
        Assert.Throws<ArgumentException>(() => service.Decrypt(string.Empty));
    }

    [Fact]
    public void Decrypt_ThrowsCryptographicException_WhenCiphertextIsInvalid()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);
        var invalidCiphertext = "invalid-base64-!@#$%";

        // Act & Assert
        Assert.Throws<CryptographicException>(() => service.Decrypt(invalidCiphertext));
    }

    [Fact]
    public void Decrypt_ThrowsCryptographicException_WhenCiphertextIsTampered()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);
        var plaintext = "my-webhook-secret";
        var encrypted = service.Encrypt(plaintext);
        
        // Tamper with the ciphertext
        var bytes = Convert.FromBase64String(encrypted);
        bytes[bytes.Length - 1] ^= 0xFF; // Flip bits in the tag
        var tamperedCiphertext = Convert.ToBase64String(bytes);

        // Act & Assert
        Assert.Throws<CryptographicException>(() => service.Decrypt(tamperedCiphertext));
    }

    [Fact]
    public void Constructor_ThrowsException_WhenKeyIsNotConfigured()
    {
        // Arrange
        var configDict = new Dictionary<string, string?>();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(configDict)
            .Build();

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => 
            new AesEncryptionService(config, NullLogger<AesEncryptionService>.Instance));
    }

    [Fact]
    public void Constructor_ThrowsException_WhenKeyIsInvalidLength()
    {
        // Arrange - Use a 16-byte key instead of 32
        var key = new byte[16];
        RandomNumberGenerator.Fill(key);
        var keyBase64 = Convert.ToBase64String(key);

        var configDict = new Dictionary<string, string?>
        {
            ["Encryption:Key"] = keyBase64
        };
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(configDict)
            .Build();

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => 
            new AesEncryptionService(config, NullLogger<AesEncryptionService>.Instance));
    }

    [Fact]
    public void Constructor_ThrowsException_WhenKeyIsNotValidBase64()
    {
        // Arrange
        var configDict = new Dictionary<string, string?>
        {
            ["Encryption:Key"] = "not-valid-base64-!@#$%"
        };
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(configDict)
            .Build();

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => 
            new AesEncryptionService(config, NullLogger<AesEncryptionService>.Instance));
    }

    [Fact]
    public void Encrypt_HandlesLongStrings()
    {
        // Arrange
        var service = new AesEncryptionService(_configuration, NullLogger<AesEncryptionService>.Instance);
        var plaintext = new string('x', 10000); // 10KB string

        // Act
        var encrypted = service.Encrypt(plaintext);
        var decrypted = service.Decrypt(encrypted);

        // Assert
        Assert.Equal(plaintext, decrypted);
    }
}
