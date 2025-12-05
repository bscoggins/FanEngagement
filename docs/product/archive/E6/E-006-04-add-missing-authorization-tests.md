---
name: "Coding Task"
about: "Add missing authorization tests"
title: "[Dev] E-006-04: Add Missing Authorization Tests"
labels: ["development", "copilot", "security", "T3", "testing"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Add any missing authorization tests identified in E-006-03. Ensure comprehensive test coverage for all authorization scenarios including cross-organization access denial and GlobalAdmin override.

This story is part of **Epic E-006: Security Documentation Update and Enhancements**.

**Depends on:** E-006-03 (Verify Authorization Test Coverage)

**Reference:** `docs/product/security-authorization-research-report.md`

---

## 2. Requirements

- Add tests for any scenarios identified as missing in E-006-03
- Ensure cross-organization access denial is tested
- Ensure GlobalAdmin override is tested for all relevant endpoints
- All tests must pass
- Follow existing test patterns in the repository

---

## 3. Acceptance Criteria (Testable)

- [ ] All missing test scenarios from E-006-03 are implemented
- [ ] Cross-organization access denial tests exist and pass
- [ ] GlobalAdmin override tests exist for all relevant endpoints
- [ ] All new tests follow existing test patterns
- [ ] All tests pass (`dotnet test`)
- [ ] No regressions in existing tests

---

## 4. Constraints

- Do not modify existing passing tests unless necessary
- Follow existing test naming and organization patterns
- Test data should be isolated per test run
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Test Patterns to Follow:**
```csharp
[Fact]
public async Task EndpointName_AsNonAdmin_ReturnsForbidden()
{
    // Arrange
    var nonAdmin = await AuthorizationTestFixtures.CreateNonMemberClientAsync(_factory);
    
    // Act
    var response = await nonAdmin.Client.GetAsync("/endpoint");
    
    // Assert
    Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
}

[Fact]
public async Task EndpointName_AsGlobalAdmin_ReturnsOk()
{
    // Arrange
    var admin = await AuthorizationTestFixtures.CreateGlobalAdminClientAsync(_factory);
    
    // Act
    var response = await admin.Client.GetAsync("/endpoint");
    
    // Assert
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
}
```

**Key Scenarios to Test:**
- GlobalAdmin can access all endpoints
- Non-admin gets 403 for admin-only endpoints
- OrgMember can access their org's resources
- OrgMember cannot access other org's resources (cross-org denial)
- OrgAdmin can manage their org's resources
- ProposalManager (creator or OrgAdmin) can manage proposals

**Key Files to Reference:**
- `backend/FanEngagement.Tests/AuthorizationIntegrationTests.cs`
- `backend/FanEngagement.Tests/Helpers/TestAuthenticationHelper.cs`
- `backend/FanEngagement.Tests/TestWebApplicationFactory.cs`

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Tests/**`

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all new tests added
- Commands to build and test the work (`dotnet test`)
- Test results showing all tests pass
- Confirmed adherence to test patterns
