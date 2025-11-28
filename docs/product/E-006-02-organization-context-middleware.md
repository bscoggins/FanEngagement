---
name: "Coding Task"
about: "Create organization context middleware for authorization"
title: "[Dev] E-006-02: Create Organization Context Middleware"
labels: ["development", "copilot", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Create middleware that extracts the organization ID from route parameters and makes it available to authorization handlers via `HttpContext.Items`. This enables authorization handlers to know which organization's permissions to check without parsing routes themselves.

This story is part of **Epic E-006: Security and Authorization Hardening**.

**Depends on:** E-006-01 (Authorization Service and Handlers)

---

## 2. Requirements

- Create middleware that runs early in the request pipeline
- Extract `organizationId` from common route parameter names (`organizationId`, `orgId`, `id` for org routes)
- Store organization context in `HttpContext.Items["OrganizationId"]`
- Handle routes that don't have organization context gracefully (no error, just no context)
- For routes with entity IDs (e.g., `/proposals/{id}`), provide mechanism to resolve organization
- Follow existing middleware patterns in the codebase

---

## 3. Acceptance Criteria (Testable)

- [ ] `OrganizationContextMiddleware` created in `FanEngagement.Api/Middleware/`
- [ ] Middleware registered in `Program.cs` request pipeline
- [ ] Organization ID extracted from `organizationId` route parameter
- [ ] Organization ID extracted from `orgId` route parameter
- [ ] `HttpContext.Items["OrganizationId"]` populated when org ID is present
- [ ] Routes without organization context work without errors
- [ ] Unit tests verify extraction from different route patterns
- [ ] Integration tests verify middleware in request pipeline
- [ ] All existing tests pass (`dotnet test`)

---

## 4. Constraints

- Do not modify existing controller logic
- Middleware must not break existing routes
- Do not add database queries in middleware (keep it lightweight)
- Maintain backward compatibility
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Example Route Patterns:**

| Route | Organization ID Source |
|-------|----------------------|
| `/organizations/{organizationId}/proposals` | `organizationId` parameter |
| `/organizations/{orgId}/memberships` | `orgId` parameter |
| `/proposals/{id}` | Requires lookup (not in middleware) |
| `/users/me/organizations` | No org context (global) |

**Middleware Pattern:**

```csharp
public class OrganizationContextMiddleware
{
    private readonly RequestDelegate _next;
    
    public OrganizationContextMiddleware(RequestDelegate next)
    {
        _next = next;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        // Extract org ID from route values
        var routeValues = context.Request.RouteValues;
        
        if (routeValues.TryGetValue("organizationId", out var orgIdValue) ||
            routeValues.TryGetValue("orgId", out orgIdValue))
        {
            if (Guid.TryParse(orgIdValue?.ToString(), out var orgId))
            {
                context.Items["OrganizationId"] = orgId;
            }
        }
        
        await _next(context);
    }
}
```

**Key Files to Reference:**
- `backend/FanEngagement.Api/Middleware/CorrelationIdMiddleware.cs` (existing middleware pattern)
- `backend/FanEngagement.Api/Middleware/GlobalExceptionHandlerMiddleware.cs` (existing middleware)
- `backend/FanEngagement.Api/Program.cs` (middleware registration)

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Api/Middleware/**` (new middleware)
- `backend/FanEngagement.Api/Program.cs` (registration)
- `backend/FanEngagement.Tests/**` (new tests)

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test the work (`dotnet build`, `dotnet test`)
- Notes on how to verify the middleware extracts org IDs correctly
- Confirmed adherence to architecture and authorization rules
