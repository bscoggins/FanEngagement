---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-09: Capture audit events for organization management"
labels: ["development", "copilot", "audit", "backend", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Capture audit events for organization management actions to track organization lifecycle changes including creation, updates (including branding), and deletion.

---

## 2. Requirements

- Audit all organization CRUD operations
- Track branding changes separately or as part of updates
- Include creator/modifier information
- Support multi-organization context

---

## 3. Acceptance Criteria (Testable)

- [ ] Audit: Organization created
  - Details: name, description, creator user ID
- [ ] Audit: Organization updated (including branding changes)
  - Details: changed fields with before/after values
  - Flag branding changes (logo, colors) specifically
- [ ] Audit: Organization deleted (if supported)
  - Details: organization ID, name, reason if provided
- [ ] Include relevant context:
  - Actor (who made the change)
  - Organization context
  - Correlation ID
- [ ] Integration tests for each organization audit event type
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering
- Use the `IAuditService` from E-005-05
- Minimal changes to existing OrganizationService
- Audit failures must not fail organization operations

---

## 5. Technical Notes (Optional)

**Existing Code:**

- `backend/FanEngagement.Infrastructure/Services/OrganizationService.cs`
- `backend/FanEngagement.Api/Controllers/OrganizationsController.cs`

**Branding Fields to Track:**

- LogoUrl
- PrimaryColor
- SecondaryColor

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
- backend/FanEngagement.Infrastructure/Services/OrganizationService.cs
- backend/FanEngagement.Api/Controllers/OrganizationsController.cs
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration tests for each organization audit event type
- All tests pass
