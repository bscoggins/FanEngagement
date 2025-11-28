---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-23: Create comprehensive audit logging tests"
labels: ["development", "copilot", "audit", "testing", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Create comprehensive tests for the audit logging system, covering unit tests, integration tests, performance tests, and E2E tests to ensure the audit functionality is reliable and performant.

---

## 2. Requirements

- Unit tests for audit service methods
- Integration tests for audit event capture across all categories
- Integration tests for audit APIs
- Performance tests for audit queries at scale
- E2E tests for audit log UI

---

## 3. Acceptance Criteria (Testable)

**Unit Tests:**
- [ ] `AuditServiceTests`:
  - `LogAsync_ValidEvent_PersistsToDatabase`
  - `LogAsync_ServiceFailure_DoesNotThrow`
  - `QueryAsync_WithFilters_ReturnsFilteredResults`
  - `QueryAsync_WithPagination_ReturnsPaginatedResults`
  - `QueryAsync_NoResults_ReturnsEmptyPage`
- [ ] `AuditEventBuilderTests`:
  - `Build_WithAllFields_CreatesCompleteEvent`
  - `Build_WithMinimalFields_CreatesValidEvent`
  - `Build_WithDetails_SerializesCorrectly`

**Integration Tests - Event Capture:**
- [ ] Test audit events for User operations:
  - User created
  - User updated
  - User deleted
  - User role changed
- [ ] Test audit events for Authentication:
  - Successful login
  - Failed login
- [ ] Test audit events for Authorization:
  - 403 response generates audit event
- [ ] Test audit events for Organization operations:
  - Organization created
  - Organization updated
- [ ] Test audit events for Membership operations:
  - Member added
  - Member removed
  - Role changed
- [ ] Test audit events for Share operations:
  - Share type created
  - Shares issued
- [ ] Test audit events for Proposal operations:
  - Proposal created
  - Proposal opened
  - Proposal closed
  - Proposal finalized
  - Option added/deleted
- [ ] Test audit events for Vote operations:
  - Vote cast
- [ ] Test audit events for Webhook operations:
  - Webhook created
  - Webhook updated
  - Webhook deleted

**Integration Tests - API:**
- [ ] `AuditEventsApiTests`:
  - `GetOrgAuditEvents_AsOrgAdmin_ReturnsEvents`
  - `GetOrgAuditEvents_AsOtherOrgAdmin_ReturnsForbidden`
  - `GetOrgAuditEvents_AsGlobalAdmin_ReturnsEvents`
  - `GetOrgAuditEvents_WithFilters_ReturnsFilteredEvents`
  - `GetOrgAuditEvents_WithPagination_ReturnsPaginatedEvents`
  - `GetAdminAuditEvents_AsGlobalAdmin_ReturnsAllOrgEvents`
  - `GetAdminAuditEvents_AsNonAdmin_ReturnsForbidden`
  - `GetUserAuditEvents_ReturnsOnlyOwnEvents`

**Performance Tests:**
- [ ] `AuditPerformanceTests`:
  - `QueryWithLargeDataset_ReturnsWithinThreshold` (100K+ events, <500ms)
  - `LogEvent_Overhead_WithinThreshold` (<10ms per event)
  - `ConcurrentLogging_HandlesLoad` (100 concurrent writes)

**E2E Tests (Playwright):**
- [ ] `AuditLogE2ETests`:
  - OrgAdmin can navigate to audit log page
  - Audit log displays events in table
  - Filters work correctly
  - Pagination works correctly
  - Event details expand on click

---

## 4. Constraints

- Follow existing test patterns in `backend/FanEngagement.Tests/`
- Use `WebApplicationFactory` for integration tests
- Use Playwright for E2E tests
- Tests must be deterministic and isolated
- Performance tests should run in CI (with appropriate thresholds)

---

## 5. Technical Notes (Optional)

**Existing Test Patterns:**

- Integration tests: `backend/FanEngagement.Tests/Integration/`
- Test fixtures: `backend/FanEngagement.Tests/Fixtures/`
- E2E tests: `frontend/e2e/`

**Test Data Setup:**

```csharp
// Seed audit events for testing
private async Task SeedAuditEventsAsync(int count)
{
    for (int i = 0; i < count; i++)
    {
        var auditEvent = AuditEventBuilder.Create(
            AuditActionType.Created,
            AuditResourceType.Proposal)
            .WithTimestamp(DateTime.UtcNow.AddDays(-i))
            .WithOrganization(testOrg.Id, testOrg.Name)
            .Build();
        await _auditService.LogAsync(auditEvent);
    }
}
```

**Performance Test Pattern:**

```csharp
[Fact]
public async Task QueryWithLargeDataset_ReturnsWithinThreshold()
{
    // Arrange
    await SeedAuditEventsAsync(100000);
    var query = new AuditQuery { OrganizationId = testOrg.Id, PageSize = 50 };

    // Act
    var stopwatch = Stopwatch.StartNew();
    var result = await _auditService.QueryAsync(query);
    stopwatch.Stop();

    // Assert
    Assert.True(stopwatch.ElapsedMilliseconds < 500, 
        $"Query took {stopwatch.ElapsedMilliseconds}ms, expected <500ms");
    Assert.Equal(50, result.Items.Count);
}
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: All implementation stories (E-005-04 through E-005-19)

---

## 6. Desired Agent

Select one:

- [ ] **Default Coding Agent**
- [ ] **docs-agent** (documentation only)
- [x] **test-agent** (tests only)
- [ ] **lint-agent** (formatting / safe refactor only)
- [ ] **product-owner-agent** (idea → epic/story refinement; no code)

---

## 7. Files Allowed to Change

Allowed:
- backend/FanEngagement.Tests/**
- frontend/e2e/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to run tests (`dotnet test`, `npx playwright test`)
- Test coverage report showing audit code coverage
- Performance test results with thresholds met
- All tests pass
