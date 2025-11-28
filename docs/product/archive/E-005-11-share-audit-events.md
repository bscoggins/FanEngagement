---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-11: Capture audit events for share management"
labels: ["development", "copilot", "audit", "backend", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Capture audit events for share management actions to track share type changes and share issuances. This is important for governance integrity as shares determine voting power.

---

## 2. Requirements

- Audit all share type CRUD operations
- Audit share issuances to users
- Include quantity and recipient information
- Track voting weight changes

---

## 3. Acceptance Criteria (Testable)

- [ ] Audit: Share type created
  - Details: name, symbol, voting weight, max supply, transferability
- [ ] Audit: Share type updated
  - Details: changed fields with before/after values
- [ ] Audit: Share type deleted
  - Details: share type ID, name, reason if provided
- [ ] Audit: Shares issued to user
  - Details: recipient user, share type, quantity, issuer
- [ ] Include relevant context:
  - Actor (who performed the action)
  - Organization context
  - Impact on voting power if applicable
- [ ] Integration tests for each share audit event type
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering
- Use the `IAuditService` from E-005-05
- Minimal changes to existing ShareTypeService/ShareIssuanceService
- Audit failures must not fail share operations

---

## 5. Technical Notes (Optional)

**Existing Code:**

- `backend/FanEngagement.Infrastructure/Services/ShareTypeService.cs`
- `backend/FanEngagement.Infrastructure/Services/ShareIssuanceService.cs`
- `backend/FanEngagement.Api/Controllers/ShareTypesController.cs`
- `backend/FanEngagement.Api/Controllers/ShareIssuancesController.cs`

**Issuance Details Example:**

```csharp
var details = new {
    RecipientUserId = recipient.Id,
    RecipientName = recipient.DisplayName,
    ShareTypeId = shareType.Id,
    ShareTypeName = shareType.Name,
    Quantity = quantity,
    VotingWeightPerShare = shareType.VotingWeight,
    TotalVotingPowerAdded = quantity * shareType.VotingWeight
};
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-05 (Audit service)
- Important for: Governance integrity, voting power auditing

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
- backend/FanEngagement.Infrastructure/Services/ShareTypeService.cs
- backend/FanEngagement.Infrastructure/Services/ShareIssuanceService.cs
- backend/FanEngagement.Api/Controllers/ShareTypesController.cs
- backend/FanEngagement.Api/Controllers/ShareIssuancesController.cs
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration tests for each share audit event type
- All tests pass
