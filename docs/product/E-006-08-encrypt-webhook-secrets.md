---
name: "Coding Task"
about: "Encrypt webhook secrets at rest"
title: "[Dev] E-006-08: Encrypt Webhook Secrets at Rest"
labels: ["development", "copilot", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Implement encryption for webhook secrets stored in the database to protect against database-level breaches. Secrets should be encrypted before storage and decrypted only when needed for webhook delivery.

This story is part of **Epic E-006: Security Documentation Update and Enhancements**.

**Reference:** `docs/product/security-authorization-research-report.md`

---

## 2. Requirements

- Add encryption service for sensitive fields
- Encrypt `WebhookEndpoint.Secret` before storage
- Decrypt secrets only when needed for delivery
- Migrate existing secrets to encrypted format
- Follow existing service patterns in the repository

---

## 3. Acceptance Criteria (Testable)

- [ ] Encryption service created for sensitive data
- [ ] `WebhookEndpoint.Secret` encrypted before database storage
- [ ] Secrets decrypted only during webhook delivery
- [ ] Migration script converts existing plaintext secrets to encrypted
- [ ] Encryption key configurable via environment/appsettings
- [ ] Unit tests verify encryption/decryption roundtrip
- [ ] Integration tests verify webhook delivery still works
- [ ] All existing tests pass (`dotnet test`)

---

## 4. Constraints

- Use well-established encryption algorithms (AES-256-GCM recommended)
- Do not break existing webhook functionality
- Encryption key must not be hardcoded
- Follow existing service patterns
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Recommended Approach:**

1. **Create Encryption Service:**
```csharp
public interface IEncryptionService
{
    string Encrypt(string plaintext);
    string Decrypt(string ciphertext);
}

public class AesEncryptionService : IEncryptionService
{
    private readonly byte[] _key;
    
    public AesEncryptionService(IConfiguration configuration)
    {
        var keyString = configuration["Encryption:Key"];
        _key = Convert.FromBase64String(keyString);
    }
    
    public string Encrypt(string plaintext)
    {
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV();
        
        using var encryptor = aes.CreateEncryptor();
        var plaintextBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipherBytes = encryptor.TransformFinalBlock(plaintextBytes, 0, plaintextBytes.Length);
        
        // Prepend IV to ciphertext
        var result = new byte[aes.IV.Length + cipherBytes.Length];
        aes.IV.CopyTo(result, 0);
        cipherBytes.CopyTo(result, aes.IV.Length);
        
        return Convert.ToBase64String(result);
    }
    
    public string Decrypt(string ciphertext)
    {
        var fullCipher = Convert.FromBase64String(ciphertext);
        
        using var aes = Aes.Create();
        aes.Key = _key;
        
        var iv = fullCipher.Take(16).ToArray();
        var cipher = fullCipher.Skip(16).ToArray();
        
        aes.IV = iv;
        using var decryptor = aes.CreateDecryptor();
        var plaintextBytes = decryptor.TransformFinalBlock(cipher, 0, cipher.Length);
        
        return Encoding.UTF8.GetString(plaintextBytes);
    }
}
```

2. **Update WebhookEndpoint Entity:**
```csharp
// Consider using a value converter or manual encryption in service
public class WebhookEndpoint
{
    public string EncryptedSecret { get; set; } // Stored encrypted
    
    // Not persisted - only used in memory
    [NotMapped]
    public string Secret { get; set; }
}
```

3. **Configuration:**
```json
{
  "Encryption": {
    "Key": "<base64-encoded-32-byte-key>"
  }
}
```

**Key Files to Modify:**
- `backend/FanEngagement.Infrastructure/Services/` (new encryption service)
- `backend/FanEngagement.Domain/Entities/WebhookEndpoint.cs`
- `backend/FanEngagement.Infrastructure/Services/WebhookDeliveryService.cs` (decrypt on use)
- `backend/FanEngagement.Api/Controllers/WebhookEndpointsController.cs` (encrypt on save)

**Migration Considerations:**
- Create a one-time migration script to encrypt existing secrets
- Ensure migration is idempotent (can be run multiple times safely)
- Consider a marker field to track encrypted vs plaintext secrets during migration

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Infrastructure/**`
- `backend/FanEngagement.Domain/**`
- `backend/FanEngagement.Api/**`
- `backend/FanEngagement.Tests/**`

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test the work (`dotnet build`, `dotnet test`)
- Explanation of encryption implementation
- Migration script/instructions for existing secrets
- Confirmed adherence to security best practices
