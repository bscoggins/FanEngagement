---
name: "Documentation Task"
about: "Document the authorization infrastructure"
title: "[Dev] E-006-02: Document Authorization Infrastructure"
labels: ["documentation", "copilot", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **docs-agent**. It should NOT modify production code.

---

## 1. Summary

Add documentation for the authorization infrastructure implemented in `backend/FanEngagement.Api/Authorization/`. This helps developers understand how the authorization system works and how to apply it to new endpoints.

This story is part of **Epic E-006: Security Documentation Update and Enhancements**.

---

## 2. Requirements

- Document each authorization handler and requirement class
- Explain how `RouteValueHelpers` extracts organization ID from routes
- Document how policies are registered in `Program.cs`
- Provide examples of policy usage on controllers
- Add to `docs/architecture.md` or create separate security documentation

---

## 3. Acceptance Criteria (Testable)

- [ ] `OrganizationMemberHandler` and `OrganizationMemberRequirement` documented
- [ ] `OrganizationAdminHandler` and `OrganizationAdminRequirement` documented
- [ ] `ProposalManagerHandler` and `ProposalManagerRequirement` documented
- [ ] `RouteValueHelpers` organization ID extraction documented
- [ ] Policy registration in `Program.cs` documented
- [ ] Examples of `[Authorize(Policy = "...")]` usage provided
- [ ] GlobalAdmin bypass behavior documented

---

## 4. Constraints

- Documentation changes only - do NOT modify any code
- Follow existing documentation style and format
- Keep technical accuracy by referencing actual code

---

## 5. Technical Notes

**Authorization Files to Document:**
- `backend/FanEngagement.Api/Authorization/OrganizationMemberRequirement.cs`
- `backend/FanEngagement.Api/Authorization/OrganizationMemberHandler.cs`
- `backend/FanEngagement.Api/Authorization/OrganizationAdminRequirement.cs`
- `backend/FanEngagement.Api/Authorization/OrganizationAdminHandler.cs`
- `backend/FanEngagement.Api/Authorization/ProposalManagerRequirement.cs`
- `backend/FanEngagement.Api/Authorization/ProposalManagerHandler.cs`
- `backend/FanEngagement.Api/Authorization/RouteValueHelpers.cs`

**Key Concepts to Explain:**
1. How handlers implement `IAuthorizationHandler<TRequirement>`
2. How handlers extract user ID from JWT claims
3. How handlers query `OrganizationMembership` table
4. How GlobalAdmin users bypass organization checks
5. How organization ID is extracted from route parameters

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
- Confirmation that documentation matches actual implementation
