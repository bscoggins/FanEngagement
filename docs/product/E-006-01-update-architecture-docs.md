---
name: "Coding Task"
about: "Update architecture documentation authorization tables"
title: "[Dev] E-006-01: Update Architecture Documentation Authorization Tables"
labels: ["documentation", "copilot", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **docs-agent**. It should NOT modify production code.

---

## 1. Summary

Update the `docs/architecture.md` file to correctly reflect the current authorization implementation. The documentation currently shows many endpoints as having ⚠️ AUTH-ONLY or ⚠️ OPEN authorization status, but code review confirms all endpoints now have proper authorization policies.

This story is part of **Epic E-006: Security Documentation Update and Enhancements**.

**Reference:** `docs/product/security-authorization-research-report.md`

---

## 2. Requirements

- Update the "Current Authorization Implementation" table in `docs/architecture.md`
- Change all ⚠️ AUTH-ONLY markers to ✅ ENFORCED with correct policy names
- Change all ⚠️ OPEN markers to ✅ ENFORCED with correct policy names
- Update the "Implementation Gaps & Security Concerns" section to indicate issues are resolved
- Update or remove the "Migration Path to Proper Authorization" section
- Ensure documentation accurately reflects actual controller authorization

---

## 3. Acceptance Criteria (Testable)

- [ ] All user management API rows updated with correct enforcement status (GlobalAdmin)
- [ ] All organization API rows updated with correct enforcement status (GlobalAdmin, OrgMember, OrgAdmin)
- [ ] All membership API rows updated with correct enforcement status (OrgMember, OrgAdmin)
- [ ] All share type/issuance API rows updated with correct enforcement status (OrgMember, OrgAdmin)
- [ ] All proposal API rows updated with correct enforcement status (OrgMember, ProposalManager)
- [ ] All voting API rows updated with correct enforcement status (OrgMember)
- [ ] All webhook API rows updated with correct enforcement status (OrgAdmin)
- [ ] "Implementation Gaps & Security Concerns" section updated
- [ ] No misleading security warnings remain in documentation

---

## 4. Constraints

- Documentation changes only - do NOT modify any code
- Preserve overall document structure
- Keep the authorization matrix format consistent
- Cross-reference actual controller code to verify accuracy

---

## 5. Technical Notes

**Current State to Update:**
```
| List all users | ⚠️ AUTH-ONLY | - any authenticated user can list |
| View any user | ⚠️ AUTH-ONLY | - any authenticated user can view |
```

**Should Be:**
```
| List all users | ✅ ENFORCED | GlobalAdmin policy |
| View any user | ✅ ENFORCED | GlobalAdmin policy |
```

**Controllers to Reference:**
- `backend/FanEngagement.Api/Controllers/UsersController.cs`
- `backend/FanEngagement.Api/Controllers/OrganizationsController.cs`
- `backend/FanEngagement.Api/Controllers/MembershipsController.cs`
- `backend/FanEngagement.Api/Controllers/ShareTypesController.cs`
- `backend/FanEngagement.Api/Controllers/ShareIssuancesController.cs`
- `backend/FanEngagement.Api/Controllers/ProposalsController.cs`
- `backend/FanEngagement.Api/Controllers/WebhookEndpointsController.cs`
- `backend/FanEngagement.Api/Controllers/OutboundEventsController.cs`

---

## 6. Desired Agent

- [x] **docs-agent** (documentation only)

---

## 7. Files Allowed to Change

Allowed:
- `docs/architecture.md`

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all documentation changes
- Confirmation that each change was verified against actual controller code
- List of sections updated
