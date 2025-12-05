---
name: "Coding Task"
about: "Add multi-factor authentication (MFA) support"
title: "[Dev] E-006-09: Add MFA Support"
labels: ["development", "copilot", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Implement optional multi-factor authentication (MFA) support using Time-based One-Time Passwords (TOTP) for admin users. This enhances account security by requiring a second factor during authentication.

This story is part of **Epic E-006: Security Documentation Update and Enhancements**.

**Reference:** `docs/product/security-authorization-research-report.md`

---

## 2. Requirements

- Implement TOTP-based MFA (compatible with Google Authenticator, Authy, etc.)
- Allow admin users to enable/disable MFA for their account
- Provide MFA setup flow with QR code generation
- Validate TOTP codes during login when MFA is enabled
- Include backup/recovery codes for account recovery
- Follow existing authentication patterns in the repository

---

## 3. Acceptance Criteria (Testable)

- [ ] MFA can be enabled by admin users in account settings
- [ ] QR code generated for TOTP setup (compatible with authenticator apps)
- [ ] TOTP validation during login for MFA-enabled accounts
- [ ] Backup codes generated when MFA is enabled
- [ ] Backup codes can be used for recovery if authenticator is lost
- [ ] MFA can be disabled by user (requires current TOTP or backup code)
- [ ] API endpoints for MFA setup, enable, disable, and validate
- [ ] Frontend UI for MFA setup and login flow
- [ ] Unit tests for TOTP generation and validation
- [ ] Integration tests for MFA login flow
- [ ] All existing tests pass (`dotnet test`)

---

## 4. Constraints

- Use well-established TOTP library (e.g., `OtpNet` for .NET)
- MFA should be optional, not mandatory (initially)
- Do not break existing non-MFA login flow
- Backup codes must be securely stored (hashed)
- Follow existing authentication patterns
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Recommended Approach:**

1. **Install TOTP Library:**
```bash
dotnet add package OtpNet
```

2. **MFA Service Interface:**
```csharp
public interface IMfaService
{
    MfaSetupResult SetupMfa(Guid userId);
    bool ValidateTotp(Guid userId, string code);
    string[] GenerateBackupCodes(Guid userId);
    bool ValidateBackupCode(Guid userId, string code);
    Task EnableMfaAsync(Guid userId, string totpCode, CancellationToken ct);
    Task DisableMfaAsync(Guid userId, string code, CancellationToken ct);
}

public class MfaSetupResult
{
    public string SecretKey { get; set; }
    public string QrCodeUri { get; set; }
    public string[] BackupCodes { get; set; }
}
```

3. **TOTP Generation and Validation:**
```csharp
public class TotpMfaService : IMfaService
{
    public MfaSetupResult SetupMfa(Guid userId)
    {
        var secretKey = KeyGeneration.GenerateRandomKey(20);
        var base32Secret = Base32Encoding.ToString(secretKey);
        
        var totp = new Totp(secretKey);
        var uri = $"otpauth://totp/FanEngagement:{userId}?secret={base32Secret}&issuer=FanEngagement";
        
        return new MfaSetupResult
        {
            SecretKey = base32Secret,
            QrCodeUri = uri,
            BackupCodes = GenerateBackupCodes(userId)
        };
    }
    
    public bool ValidateTotp(Guid userId, string code)
    {
        // Retrieve user's secret from database
        var secretKey = GetUserSecret(userId);
        var totp = new Totp(Base32Encoding.ToBytes(secretKey));
        return totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);
    }
}
```

4. **User Entity Updates:**
```csharp
public class User
{
    // Existing properties...
    
    public bool MfaEnabled { get; set; }
    public string? MfaSecret { get; set; } // Encrypted
    public string? MfaBackupCodesHash { get; set; } // Hashed backup codes
}
```

5. **API Endpoints:**
- `POST /users/me/mfa/setup` - Initialize MFA setup, returns QR code URI
- `POST /users/me/mfa/enable` - Enable MFA after validating initial TOTP
- `POST /users/me/mfa/disable` - Disable MFA (requires TOTP or backup code)
- `POST /auth/login/mfa` - Validate TOTP during login

6. **Login Flow Update:**
```csharp
// In authentication service
public async Task<LoginResult> LoginAsync(LoginRequest request)
{
    var user = await ValidateCredentialsAsync(request);
    if (user == null) return LoginResult.Failed();
    
    if (user.MfaEnabled)
    {
        // Return partial token indicating MFA is required
        return LoginResult.MfaRequired(user.Id);
    }
    
    return LoginResult.Success(GenerateToken(user));
}

public async Task<LoginResult> ValidateMfaAsync(Guid userId, string totpCode)
{
    if (!_mfaService.ValidateTotp(userId, totpCode))
    {
        return LoginResult.Failed();
    }
    
    var user = await _userRepository.GetByIdAsync(userId);
    return LoginResult.Success(GenerateToken(user));
}
```

**Key Files to Modify:**
- `backend/FanEngagement.Domain/Entities/User.cs` (add MFA fields)
- `backend/FanEngagement.Infrastructure/Services/` (new MFA service)
- `backend/FanEngagement.Api/Controllers/AuthController.cs` (MFA login flow)
- `backend/FanEngagement.Api/Controllers/UsersController.cs` (MFA setup endpoints)
- `frontend/src/pages/Login.tsx` (MFA input step)
- `frontend/src/pages/Settings.tsx` or similar (MFA setup UI)

**Database Migration:**
- Add `MfaEnabled`, `MfaSecret`, `MfaBackupCodesHash` columns to Users table

**Frontend Considerations:**
- Use a QR code library (e.g., `qrcode.react`) to display setup QR code
- Add MFA code input field to login flow when MFA is required
- Add MFA settings page for enable/disable

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Domain/**`
- `backend/FanEngagement.Infrastructure/**`
- `backend/FanEngagement.Application/**`
- `backend/FanEngagement.Api/**`
- `backend/FanEngagement.Tests/**`
- `frontend/src/**`

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test the work (`dotnet build`, `dotnet test`, `npm test`)
- Explanation of MFA implementation
- Database migration for new fields
- Screenshots of MFA setup UI flow
- Confirmed adherence to security best practices
