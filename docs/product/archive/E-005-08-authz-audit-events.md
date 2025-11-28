---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-08: Capture audit events for authorization failures"
labels: ["development", "copilot", "audit", "backend", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Capture audit events for authorization failures to track access control issues, detect potential security threats, and support incident investigation.

---

## 2. Requirements

- Audit 403 Forbidden responses
- Audit policy authorization failures
- Create middleware or authorization handler to capture these events automatically
- Include context about the denied request without exposing sensitive data
- Balance security logging with privacy concerns

---

## 3. Acceptance Criteria (Testable)

- [ ] Audit: 403 Forbidden responses
  - Details: requested path, HTTP method, user ID
- [ ] Audit: Policy authorization failures
  - Details: policy name, required claims/roles, user's actual roles
- [ ] Include relevant context:
  - Requested resource and action
  - User's current roles/memberships
  - Policy that denied access
- [ ] Create `AuditingAuthorizationMiddleware` or extend existing authorization handler
- [ ] Avoid logging sensitive request bodies
- [ ] Integration tests for authorization failure auditing
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering
- Use the `IAuditService` from E-005-05
- Do not log request bodies that may contain sensitive data
- Audit failures must not affect the authorization response

---

## 5. Technical Notes (Optional)

**Implementation Approach:**

Option A: Create middleware that intercepts 403 responses
```csharp
public class AuditingAuthorizationMiddleware
{
    public async Task InvokeAsync(HttpContext context, IAuditService auditService)
    {
        await _next(context);
        
        if (context.Response.StatusCode == 403)
        {
            await auditService.LogAsync(...);
        }
    }
}
```

Option B: Extend authorization handler
```csharp
public class AuditingAuthorizationHandler : IAuthorizationHandler
{
    public async Task HandleAsync(AuthorizationHandlerContext context)
    {
        // After authorization evaluation
        if (context.HasFailed)
        {
            await _auditService.LogAsync(...);
        }
    }
}
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-05 (Audit service)
- Related to: E-005-07 (Authentication auditing)

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
- backend/FanEngagement.Api/Middleware/**
- backend/FanEngagement.Api/Authorization/**
- backend/FanEngagement.Api/Program.cs
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration tests triggering authorization failures and verifying audit events
- Documentation of which authorization failures are audited
- All tests pass
