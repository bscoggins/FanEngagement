---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-17: Implement audit event export"
labels: ["development", "copilot", "audit", "backend", "api", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Implement audit event export functionality to allow audit data extraction for compliance verification and external analysis.

---

## 2. Requirements

- Create export endpoints for CSV and JSON formats
- Support same filtering as query endpoints
- Stream large exports efficiently
- Add rate limiting to prevent abuse
- Audit the export action itself

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `GET /organizations/{orgId}/audit-events/export` endpoint:
  - Requires OrgAdmin role or GlobalAdmin
  - Supports format query parameter: `format=csv` or `format=json`
  - Applies same filters as query endpoint (actionType, resourceType, dateFrom, dateTo, etc.)
  - Streams response for large exports
  - Returns appropriate Content-Type header
- [ ] Create `GET /admin/audit-events/export` for GlobalAdmin:
  - Cross-organization export capability
  - Additional filter: organizationId
- [ ] Implement streaming for large datasets:
  - Use chunked transfer encoding
  - Avoid loading all events into memory
- [ ] Add rate limiting:
  - Limit export requests per user/hour
  - Return 429 Too Many Requests when exceeded
- [ ] Audit the export action itself:
  - Log who exported what date range
  - Include filter parameters used
- [ ] Integration tests for export functionality
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering and API patterns
- Use the `IAuditService` from E-005-05
- Ensure memory-efficient streaming for large exports
- Rate limiting should be configurable

---

## 5. Technical Notes (Optional)

**Streaming CSV Export:**

```csharp
[HttpGet("export")]
public async Task ExportAuditEvents([FromQuery] AuditExportRequest request)
{
    Response.ContentType = request.Format == "csv" 
        ? "text/csv" 
        : "application/json";
    Response.Headers["Content-Disposition"] = 
        $"attachment; filename=audit-events-{DateTime.UtcNow:yyyyMMdd}.{request.Format}";

    await foreach (var batch in _auditService.StreamEventsAsync(query))
    {
        // Write batch to response
        await Response.Body.WriteAsync(...);
        await Response.Body.FlushAsync();
    }
}
```

**Rate Limiting:**

Consider using ASP.NET Core rate limiting middleware or a custom implementation.

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-16 (Query APIs)
- Related to: E-005-18, E-005-19 (UI export buttons)

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
- backend/FanEngagement.Api/Controllers/**
- backend/FanEngagement.Application/Interfaces/**
- backend/FanEngagement.Infrastructure/Services/**
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration tests for CSV and JSON export
- Demonstration of streaming behavior
- Rate limiting configuration documentation
- All tests pass
