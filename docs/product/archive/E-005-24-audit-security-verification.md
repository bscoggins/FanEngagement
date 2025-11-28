---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-24: Verify audit log security"
labels: ["development", "copilot", "audit", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Verify the security of the audit logging system to ensure audit data is protected, access is properly controlled, and sensitive data is not exposed.

---

## 2. Requirements

- Verify append-only storage (no update/delete APIs)
- Verify authorization enforcement on audit queries
- Verify sensitive data exclusion
- Verify audit of audit access (meta-auditing)
- Security review sign-off

---

## 3. Acceptance Criteria (Testable)

- [ ] Verify audit logs are append-only:
  - No public update APIs for audit events
  - No public delete APIs for audit events (except retention purge)
  - Attempted modifications return 405 Method Not Allowed or 404
- [ ] Verify OrgAdmins can only query their organization's events:
  - Test that OrgAdmin of Org A cannot query Org B events
  - Test that cross-org queries return 403 Forbidden
- [ ] Verify Members cannot access audit APIs (except own actions):
  - Test that Member role gets 403 on org audit endpoints
  - Test that Member can access /users/me/audit-events
  - Test that /users/me/audit-events only returns own events
- [ ] Verify sensitive data is not logged:
  - Scan audit events for password fields
  - Scan audit events for webhook secrets
  - Scan audit events for full JWT tokens
  - Scan audit events for credit card or PII patterns
- [ ] Verify audit of audit access (meta-auditing):
  - Audit queries generate their own audit events
  - Export operations are audited
- [ ] Create security test suite for audit system
- [ ] Document security controls and verification results
- [ ] Security review sign-off checklist

---

## 4. Constraints

- Test-focused task
- May require penetration testing approach
- Document all findings
- Security review must sign off before production use

---

## 5. Technical Notes (Optional)

**Security Test Patterns:**

```csharp
[Fact]
public async Task OrgAdmin_CannotQuery_OtherOrganization_Events()
{
    // Setup: OrgAdmin for Org A
    var orgAAdminToken = await GetOrgAdminToken(orgAId);
    _client.DefaultRequestHeaders.Authorization = 
        new AuthenticationHeaderValue("Bearer", orgAAdminToken);
    
    // Act: Try to query Org B events
    var response = await _client.GetAsync($"/organizations/{orgBId}/audit-events");
    
    // Assert: Should be forbidden
    Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
}

[Fact]
public async Task AuditEvents_DoNotContain_Passwords()
{
    // Create user with password
    await CreateUserAsync(email, password);
    
    // Query audit events
    var events = await GetAuditEventsAsync();
    
    // Assert: No event contains the password
    foreach (var evt in events)
    {
        Assert.DoesNotContain(password, evt.Details?.ToString() ?? "");
    }
}
```

**Sensitive Data Patterns to Check:**

- Passwords: `password`, `pwd`, `secret`
- Tokens: JWT patterns, API keys
- Webhook secrets
- PII: SSN patterns, credit card patterns

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: All audit implementation stories
- Critical for: Production deployment approval

---

## 6. Desired Agent

Select one:

- [ ] **Default Coding Agent**
- [ ] **docs-agent** (documentation only)
- [x] **test-agent** (tests only)
- [ ] **lint-agent** (formatting / safe refactor only)
- [ ] **product-owner-agent** (idea → epic/story refinement; no code)

---

## 7. Files Allowed to Change

Allowed:
- backend/FanEngagement.Tests/**
- docs/audit/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to run security tests (`dotnet test --filter "Category=Security"`)
- Security verification report documenting:
  - All tests performed
  - Results of each verification
  - Any issues found and remediation
- Security review sign-off checklist (template for human review)
- All tests pass
