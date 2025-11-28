---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-03: Define the audit event categorization"
labels: ["development", "copilot", "audit", "architecture", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Define the audit event categorization scheme to ensure events are consistently classified and queryable across the FanEngagement application. This is an **architecture/design task** that produces documentation.

---

## 2. Requirements

- Define `ActionType` enum values for all auditable actions
- Define `ResourceType` enum values for all auditable resources
- Define `Outcome` enum values for audit event results
- Create a categorization matrix mapping actions to categories
- Ensure extensibility for future event types

---

## 3. Acceptance Criteria (Testable)

- [ ] Define `ActionType` enum values:
  - `Created`, `Updated`, `Deleted`, `Accessed`, `StatusChanged`, `RoleChanged`, `Exported`, `Authenticated`, `AuthorizationDenied`
- [ ] Define `ResourceType` enum values:
  - `User`, `Organization`, `Membership`, `ShareType`, `ShareIssuance`, `ShareBalance`, `Proposal`, `ProposalOption`, `Vote`, `WebhookEndpoint`, `OutboundEvent`, `SystemConfiguration`
- [ ] Define `Outcome` enum values:
  - `Success`, `Failure`, `Denied`, `Partial`
- [ ] Document which actions map to which categories
- [ ] Create categorization matrix document
- [ ] Document extensibility guidelines for adding new event types

---

## 4. Constraints

- This is an architecture/design task only—no production code changes
- Output should be a markdown document in `docs/audit/`
- Follow existing documentation patterns in the repository
- Consider whether to capture read operations (high volume implications)

---

## 5. Technical Notes (Optional)

**Categorization Considerations:**

- ActionType should be action-verb based (what happened)
- ResourceType should be noun-based (what was affected)
- Outcome captures the result of the action attempt

**Example Mappings:**

| Action | ActionType | ResourceType |
|--------|------------|--------------|
| User registers | Created | User |
| User updates profile | Updated | User |
| User role changed | RoleChanged | User |
| Proposal opened | StatusChanged | Proposal |
| Vote cast | Created | Vote |
| Login success | Authenticated | User |
| Access denied | AuthorizationDenied | (varies) |

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-01 (Data model design)
- Dependency for: All event capture stories (E-005-06 through E-005-15)

---

## 6. Desired Agent

Select one:

- [ ] **Default Coding Agent**
- [x] **docs-agent** (documentation only)
- [ ] **test-agent** (tests only)
- [ ] **lint-agent** (formatting / safe refactor only)
- [ ] **product-owner-agent** (idea → epic/story refinement; no code)

---

## 7. Files Allowed to Change

Allowed:
- docs/audit/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Categorization document with:
  - Complete enum definitions
  - Action-to-category mapping matrix
  - Guidelines for adding new event types
  - Examples for each category
