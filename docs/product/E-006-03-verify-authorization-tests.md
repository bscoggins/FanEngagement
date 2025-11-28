---
name: "Coding Task"
about: "Verify authorization test coverage"
title: "[Dev] E-006-03: Verify Authorization Test Coverage"
labels: ["development", "copilot", "security", "T3", "testing"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Review and verify authorization test coverage to ensure all authorization scenarios are tested. This involves reviewing existing tests in `AuthorizationIntegrationTests.cs` and creating an inventory of all endpoints with their expected authorization.

This story is part of **Epic E-006: Security Documentation Update and Enhancements**.

**Reference:** `docs/product/security-authorization-research-report.md`

---

## 2. Requirements

- Review existing `AuthorizationIntegrationTests.cs`
- Create inventory of all endpoints and their expected authorization
- Identify any missing test scenarios
- Document test coverage status
- Follow existing test patterns in the repository

---

## 3. Acceptance Criteria (Testable)

- [ ] Review of `AuthorizationIntegrationTests.cs` completed
- [ ] Inventory of all API endpoints created with expected authorization policies
- [ ] Missing test scenarios identified and documented
- [ ] Test coverage status documented (percentage or list of covered/uncovered endpoints)
- [ ] Report produced in `docs/product/` or test project README

---

## 4. Constraints

- Do not modify existing passing tests
- Follow existing test naming and organization patterns
- Test data should be isolated per test run
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Existing Test Files to Review:**
- `backend/FanEngagement.Tests/AuthorizationIntegrationTests.cs`
- `backend/FanEngagement.Tests/MultiTenancyTests.cs`

**Controllers to Inventory:**
- `UsersController` - GlobalAdmin policies
- `OrganizationsController` - GlobalAdmin, OrgMember, OrgAdmin policies
- `MembershipsController` - OrgMember, OrgAdmin policies
- `ShareTypesController` - OrgMember, OrgAdmin policies
- `ShareIssuancesController` - OrgMember, OrgAdmin policies
- `ProposalsController` - OrgMember, ProposalManager policies
- `WebhookEndpointsController` - OrgAdmin policies
- `OutboundEventsController` - OrgAdmin policies

**Expected Test Scenarios:**
- GlobalAdmin can access admin-only endpoints
- Non-admin cannot access admin-only endpoints (403)
- OrgMember can access org resources they belong to
- Non-member cannot access org resources (403)
- Cross-organization access denied
- Self-access patterns work correctly

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Tests/**` (analysis only, no modifications in this story)
- `docs/product/**` (for coverage report)

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of test coverage analysis
- Inventory of endpoints and their test coverage status
- List of missing test scenarios (if any)
- Recommendation for E-006-04 (add missing tests)
