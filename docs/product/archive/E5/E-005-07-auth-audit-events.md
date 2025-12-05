---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-07: Capture audit events for authentication"
labels: ["development", "copilot", "audit", "backend", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Capture audit events for authentication activities to track login patterns, failed attempts, and token lifecycle for security monitoring.

---

## 2. Requirements

- Audit successful and failed login attempts
- Track token refresh activities
- Include client context (IP, user agent) without exposing credentials
- Implement rate-limit protection for audit writes on repeated failures
- Be careful not to log sensitive credential data

---

## 3. Acceptance Criteria (Testable)

- [ ] Audit: Successful login (token issued)
  - Details: user ID, IP address, user agent
- [ ] Audit: Failed login attempt (invalid credentials)
  - Details: attempted email/username, IP address, failure reason (generic)
  - Do NOT log: actual password or credential details
- [ ] Audit: Token refresh
  - Details: user ID, refresh timestamp
- [ ] Audit: Logout (if implemented)
  - Details: user ID, session duration
- [ ] Include relevant context:
  - IP address
  - User agent (truncated if too long)
  - Failure reason (without exposing security details)
- [ ] Rate-limit protection: batch or throttle audit writes for repeated failures from same IP
- [ ] Integration tests for authentication audit events
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering
- Use the `IAuditService` from E-005-05
- Never log passwords, tokens, or credential material
- Audit failures must not fail authentication operations

---

## 5. Technical Notes (Optional)

**Existing Code:**

- `backend/FanEngagement.Api/Controllers/AuthController.cs`
- Authentication service/middleware

**Security Considerations:**

- Failed login audit events should use generic failure reasons
- Avoid logging enough detail to enable enumeration attacks
- Consider IP-based rate limiting for audit writes

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-05 (Audit service)
- Related to: E-005-08 (Authorization failure auditing)

---

## 6. Desired Agent

Select one:

- [x] **Default Coding Agent**
- [ ] **docs-agent** (documentation only)
- [ ] **test-agent** (tests only)
- [ ] **lint-agent** (formatting / safe refactor only)
- [ ] **product-owner-agent** (idea → epic/story refinement; no code)

---

## 7. Files Allowed to Change

Allowed:
- backend/FanEngagement.Api/Controllers/AuthController.cs
- backend/FanEngagement.Infrastructure/Services/**
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration tests for each authentication audit event type
- Confirmation that no sensitive credential data is logged
- All tests pass
