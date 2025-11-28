---
name: "Coding Task"
about: "Document JWT security model"
title: "[Dev] E-006-07: Document JWT Security Model"
labels: ["documentation", "copilot", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **docs-agent**. It should NOT modify production code.

---

## 1. Summary

Document the JWT security model including token expiration policy, refresh token approach, and token revocation strategy for security incidents.

This story is part of **Epic E-006: Security Documentation Update and Enhancements**.

**Reference:** `docs/product/security-authorization-research-report.md`

---

## 2. Requirements

- Document token expiration policy
- Document refresh token approach (if implemented, or recommend implementation)
- Document token revocation strategy for security incidents
- Add to architecture documentation
- Include security best practices and recommendations

---

## 3. Acceptance Criteria (Testable)

- [ ] Token expiration policy documented (current setting and recommended values)
- [ ] Refresh token approach documented (current implementation or recommendation)
- [ ] Token revocation strategy documented (how to handle compromised tokens)
- [ ] Security incident response procedures documented
- [ ] Added to `docs/architecture.md` or new security documentation file
- [ ] Includes references to actual code configuration

---

## 4. Constraints

- Documentation changes only - do NOT modify any code
- Reference actual configuration in codebase
- Follow existing documentation style and format
- Keep technical accuracy by referencing actual code

---

## 5. Technical Notes

**JWT Configuration to Document (typically in Program.cs or appsettings):**
```csharp
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "...",
            ValidAudience = "...",
            IssuerSigningKey = new SymmetricSecurityKey(...)
        };
    });
```

**Topics to Cover:**

1. **Token Expiration:**
   - Current expiration time setting
   - Recommended production value (e.g., 15-60 minutes for access tokens)
   - Why short-lived tokens are more secure

2. **Refresh Tokens:**
   - Are refresh tokens implemented?
   - If yes: How they work, rotation policy, secure storage
   - If no: Recommendation for implementing them

3. **Token Revocation:**
   - How to invalidate tokens during security incidents
   - Options: Token blacklist, short expiration, key rotation
   - Incident response checklist

4. **Security Best Practices:**
   - HTTPS only
   - HttpOnly cookies (if applicable)
   - Secure storage on client
   - CORS configuration

**Key Files to Reference:**
- `backend/FanEngagement.Api/Program.cs` (JWT configuration)
- `backend/FanEngagement.Api/appsettings.json` (any JWT settings)
- `backend/FanEngagement.Infrastructure/Services/` (auth services)

---

## 6. Desired Agent

- [x] **docs-agent** (documentation only)

---

## 7. Files Allowed to Change

Allowed:
- `docs/architecture.md`
- `docs/` (new documentation files if needed)

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of documentation added
- Confirmation that documentation references actual code configuration
- List of sections added to architecture docs
