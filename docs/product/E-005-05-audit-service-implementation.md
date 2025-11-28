---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-05: Implement the audit service"
labels: ["development", "copilot", "audit", "backend", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Implement the core audit service that allows application code to log and query audit events. This is the foundational service that all audit event capture will use.

---

## 2. Requirements

- Follow the service architecture defined in `docs/audit/` (from E-005-02)
- Implement `IAuditService` interface with logging and querying capabilities
- Provide a fluent `AuditEventBuilder` for easy event construction
- Support both synchronous and fire-and-forget logging modes
- Ensure audit failures do not fail business operations
- Follow existing service patterns in the codebase

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `IAuditService` interface in Application layer:
  ```csharp
  Task LogAsync(AuditEvent auditEvent, CancellationToken cancellationToken = default);
  Task<PagedResult<AuditEvent>> QueryAsync(AuditQuery query, CancellationToken cancellationToken = default);
  ```
- [ ] Create `AuditEventBuilder` fluent API:
  ```csharp
  AuditEventBuilder.Create(ActionType, ResourceType)
      .WithActor(userId, displayName, ipAddress)
      .WithResource(resourceId, resourceName)
      .WithOrganization(orgId, orgName)
      .WithDetails(details)
      .WithCorrelationId(correlationId)
      .WithOutcome(outcome, failureReason)
      .Build();
  ```
- [ ] Create `AuditQuery` class with filter properties:
  - `OrganizationId` (optional)
  - `ActorUserId` (optional)
  - `ActionTypes` (optional list)
  - `ResourceTypes` (optional list)
  - `ResourceId` (optional)
  - `DateFrom` (optional)
  - `DateTo` (optional)
  - `Outcome` (optional)
  - `Page`, `PageSize` (pagination)
- [ ] Create `AuditService` implementation in Infrastructure layer
- [ ] Support fire-and-forget mode (returns immediately, logs asynchronously)
- [ ] Include structured logging of audit events for correlation
- [ ] Handle and log audit service failures gracefully (never throw to caller)
- [ ] Register service in dependency injection (`DependencyInjection.cs`)
- [ ] Add unit tests with mocked DbContext (verify event creation)
- [ ] Add integration tests verifying persistence
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering (`Application` for interfaces, `Infrastructure` for implementation)
- Use existing `PagedResult<T>` pattern for query results
- Use existing logging patterns (ILogger<T>)
- Audit failures must not cause business operation failures
- No changes to existing services (this story is foundational)

---

## 5. Technical Notes (Optional)

**Existing Patterns:**

- Interface pattern: `backend/FanEngagement.Application/Interfaces/`
- Service pattern: `backend/FanEngagement.Infrastructure/Services/`
- DI registration: `backend/FanEngagement.Infrastructure/DependencyInjection.cs`
- `PagedResult<T>`: `backend/FanEngagement.Application/DTOs/PagedResult.cs`

**Fire-and-Forget Pattern:**

Consider using `System.Threading.Channels` or `Task.Run` with proper error handling:

```csharp
public Task LogFireAndForgetAsync(AuditEvent auditEvent)
{
    _ = Task.Run(async () =>
    {
        try
        {
            await LogAsync(auditEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write audit event {AuditEventId}", auditEvent.Id);
        }
    });
    return Task.CompletedTask;
}
```

**Error Handling:**

```csharp
try
{
    await _dbContext.AuditEvents.AddAsync(auditEvent);
    await _dbContext.SaveChangesAsync();
}
catch (Exception ex)
{
    _logger.LogError(ex, "Failed to persist audit event");
    // Do NOT rethrow - audit failures should not fail operations
}
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-01 (Data model), E-005-02 (Service architecture), E-005-04 (Database schema)
- Dependency for: All event capture stories (E-005-06 through E-005-15)

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
- backend/FanEngagement.Application/Interfaces/**
- backend/FanEngagement.Application/DTOs/**
- backend/FanEngagement.Infrastructure/Services/**
- backend/FanEngagement.Infrastructure/DependencyInjection.cs
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Unit test coverage for AuditService methods
- Integration test demonstrating persistence
- Confirmation that audit failures do not propagate
- All tests pass
