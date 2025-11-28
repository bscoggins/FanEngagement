---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-10: Capture audit events for membership management"
labels: ["development", "copilot", "audit", "backend", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Capture audit events for membership management actions to track membership changes including member additions, removals, and role changes. This is critical for security auditing and privilege escalation detection.

---

## 2. Requirements

- Audit all membership operations
- Track privilege escalation (Member → OrgAdmin)
- Include target user and acting admin information
- Flag security-sensitive role changes

---

## 3. Acceptance Criteria (Testable)

- [ ] Audit: Member added to organization
  - Details: target user ID/name, organization, role assigned, inviter
- [ ] Audit: Member removed from organization
  - Details: target user ID/name, organization, who removed them, reason if provided
- [ ] Audit: Member role changed (Member ↔ OrgAdmin)
  - Details: target user, old role, new role, who changed it
  - Flag as privilege escalation if going to higher role
- [ ] Include relevant context:
  - Acting admin (who made the change)
  - Target user (who was affected)
  - Organization context
- [ ] Privilege escalation events are flagged/tagged for easy filtering
- [ ] Integration tests for each membership audit event type
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering
- Use the `IAuditService` from E-005-05
- Minimal changes to existing MembershipService
- Audit failures must not fail membership operations

---

## 5. Technical Notes (Optional)

**Existing Code:**

- `backend/FanEngagement.Infrastructure/Services/MembershipService.cs`
- `backend/FanEngagement.Api/Controllers/MembershipsController.cs`

**Privilege Escalation Detection:**

```csharp
var isPrivilegeEscalation = newRole > oldRole; // assuming enum ordering
var details = new {
    TargetUserId = targetUser.Id,
    TargetUserName = targetUser.DisplayName,
    OldRole = oldRole.ToString(),
    NewRole = newRole.ToString(),
    IsPrivilegeEscalation = isPrivilegeEscalation
};
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-05 (Audit service)
- Critical for: Security auditing, compliance

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
- backend/FanEngagement.Infrastructure/Services/MembershipService.cs
- backend/FanEngagement.Api/Controllers/MembershipsController.cs
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration tests for each membership audit event type
- Demonstration that privilege escalation events are properly flagged
- All tests pass
