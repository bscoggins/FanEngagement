---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-06: Capture audit events for user management actions"
labels: ["development", "copilot", "audit", "backend", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Capture audit events for all user management actions to track user lifecycle changes including registration, profile updates, deletion, and role changes.

---

## 2. Requirements

- Audit all user CRUD operations
- Track privilege escalation through role changes
- Include relevant details for each operation
- Ensure sensitive data (passwords) is never logged
- No performance degradation on user operations

---

## 3. Acceptance Criteria (Testable)

- [ ] Audit: User created (registration)
  - Details: email, displayName, role assigned
- [ ] Audit: User updated (profile changes)
  - Details: changed fields with before/after values (excluding sensitive data)
- [ ] Audit: User deleted
  - Details: user ID, display name, deletion reason if provided
- [ ] Audit: User role changed (privilege escalation tracking)
  - Details: old role, new role, who changed it
- [ ] Sensitive fields (password, tokens) are NOT logged
- [ ] All audit events include:
  - Actor (user who performed action, or system)
  - Correlation ID
  - Timestamp
  - Outcome (success/failure)
- [ ] Integration tests verifying audit events are created for each operation
- [ ] No performance degradation on user operations (measure before/after)
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering
- Use the `IAuditService` from E-005-05
- Minimal changes to existing UserService/UsersController
- Audit failures must not fail user operations

---

## 5. Technical Notes (Optional)

**Existing Code:**

- `backend/FanEngagement.Infrastructure/Services/UserService.cs`
- `backend/FanEngagement.Api/Controllers/UsersController.cs`

**Integration Pattern:**

```csharp
public async Task<User> CreateAsync(CreateUserRequest request, CancellationToken ct)
{
    // ... existing creation logic ...
    await _dbContext.SaveChangesAsync(ct);

    // Audit after successful commit
    await _auditService.LogAsync(
        AuditEventBuilder.Create(AuditActionType.Created, AuditResourceType.User)
            .WithResource(user.Id, user.DisplayName)
            .WithDetails(new { user.Email, user.DisplayName, user.Role })
            .WithOutcome(AuditOutcome.Success)
            .Build(),
        ct);

    return user;
}
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-05 (Audit service)

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
- backend/FanEngagement.Infrastructure/Services/UserService.cs
- backend/FanEngagement.Api/Controllers/UsersController.cs
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration tests for each user audit event type
- Confirmation that no sensitive data is logged
- All tests pass
