---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-16: Create audit query API endpoints"
labels: ["development", "copilot", "audit", "backend", "api", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Create REST API endpoints for querying audit events, enabling OrgAdmins, PlatformAdmins, and users to retrieve audit trails programmatically.

---

## 2. Requirements

- Implement organization-scoped audit query endpoint for OrgAdmins
- Implement cross-organization audit query endpoint for PlatformAdmins
- Implement user self-query endpoint for viewing own actions
- Support filtering by multiple criteria
- Support pagination
- Enforce proper authorization

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `GET /organizations/{orgId}/audit-events` endpoint:
  - Requires OrgAdmin role for the organization OR GlobalAdmin
  - Query parameters:
    - `actionType` (optional, comma-separated list)
    - `resourceType` (optional, comma-separated list)
    - `resourceId` (optional)
    - `actorUserId` (optional)
    - `dateFrom` (optional, ISO 8601)
    - `dateTo` (optional, ISO 8601)
    - `outcome` (optional)
    - `page` (default: 1)
    - `pageSize` (default: 50, max: 100)
  - Returns `PagedResult<AuditEventDto>`
- [ ] Create `GET /admin/audit-events` endpoint:
  - Requires GlobalAdmin (PlatformAdmin) role
  - Additional query parameter: `organizationId` (optional)
  - Cross-organization query capability
  - Same filtering and pagination as org-scoped endpoint
- [ ] Create `GET /users/me/audit-events` endpoint:
  - Returns current user's own actions only
  - Limited fields for privacy (no IP addresses of others)
  - Same filtering and pagination
- [ ] Create `AuditEventDto` with fields:
  - `id`, `timestamp`, `actorUserId`, `actorDisplayName`
  - `actionType`, `resourceType`, `resourceId`, `resourceName`
  - `organizationId`, `organizationName`
  - `outcome`, `failureReason`
  - `details` (JSON)
- [ ] Add OpenAPI documentation for all endpoints
- [ ] Add authorization policy enforcement with proper 403 responses
- [ ] Integration tests for:
  - Successful queries with various filters
  - Pagination
  - Authorization enforcement (OrgAdmin can't query other orgs)
  - GlobalAdmin cross-org access
  - User self-query isolation
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing controller patterns
- Use existing `PagedResult<T>` pattern
- Use existing authorization policies where applicable
- No sensitive data exposure (e.g., other users' IP addresses in self-query)

---

## 5. Technical Notes (Optional)

**Existing Patterns:**

- Controllers: `backend/FanEngagement.Api/Controllers/`
- Authorization: `[Authorize(Policy = "OrgAdmin")]`, `[Authorize(Policy = "GlobalAdmin")]`
- Pagination: Existing `page` and `pageSize` query parameters

**Controller Structure:**

```csharp
[ApiController]
[Route("organizations/{orgId}/audit-events")]
public class OrganizationAuditEventsController : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = "OrgAdminOrGlobalAdmin")]
    [ProducesResponseType(typeof(PagedResult<AuditEventDto>), 200)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> GetAuditEvents(
        Guid orgId,
        [FromQuery] string? actionType,
        [FromQuery] string? resourceType,
        [FromQuery] Guid? resourceId,
        [FromQuery] Guid? actorUserId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] string? outcome,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        // Implementation
    }
}
```

**Query Building:**

```csharp
var query = new AuditQuery
{
    OrganizationId = orgId,
    ActionTypes = ParseEnumList<AuditActionType>(actionType),
    ResourceTypes = ParseEnumList<AuditResourceType>(resourceType),
    ResourceId = resourceId,
    ActorUserId = actorUserId,
    DateFrom = dateFrom,
    DateTo = dateTo,
    Outcome = ParseEnum<AuditOutcome>(outcome),
    Page = page,
    PageSize = Math.Min(pageSize, 100)
};
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-05 (Audit service)
- Dependency for: E-005-17 (Export), E-005-18 (OrgAdmin UI), E-005-19 (PlatformAdmin UI)

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
- backend/FanEngagement.Application/DTOs/**
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- OpenAPI documentation visible in Swagger
- Integration tests for all endpoints and authorization scenarios
- All tests pass
