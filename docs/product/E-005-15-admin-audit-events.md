---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-15: Capture audit events for admin actions"
labels: ["development", "copilot", "audit", "backend", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Capture audit events for platform administration actions to track privileged operations like data seeding, resets, and cleanup. Important for security and compliance.

---

## 2. Requirements

- Audit dev/demo data operations
- Track data reset triggers
- Track E2E cleanup operations
- Include admin user information
- Note environment restrictions

---

## 3. Acceptance Criteria (Testable)

- [ ] Audit: Dev data seeded
  - Details: admin user, timestamp, environment
- [ ] Audit: Data reset triggered
  - Details: admin user, scope of reset, timestamp
- [ ] Audit: E2E cleanup performed
  - Details: admin user, what was cleaned up, timestamp
- [ ] Include relevant context:
  - Admin user who triggered the action
  - Action parameters if applicable
  - Environment (Development, Demo, Production)
- [ ] Note environment restrictions in audit events
  - Flag if action was performed in non-dev environment
- [ ] Integration tests for admin action audit events
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering
- Use the `IAuditService` from E-005-05
- Some actions may be restricted to development/demo environments
- Audit failures must not fail admin operations

---

## 5. Technical Notes (Optional)

**Existing Code:**

- `backend/FanEngagement.Api/Controllers/AdminController.cs`
- Dev data seeding endpoints
- Reset data endpoints

**Environment Detection:**

```csharp
var environment = _hostEnvironment.EnvironmentName;
var isProductionAction = environment == "Production";
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-05 (Audit service)
- Important for: Security compliance, incident investigation

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
- backend/FanEngagement.Api/Controllers/AdminController.cs
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration tests for admin action audit events
- Documentation of environment restrictions
- All tests pass
