---
name: "Coding Task"
about: "Create authorization service and handlers for FanEngagement"
title: "[Dev] E-006-01: Create Authorization Service and Handlers"
labels: ["development", "copilot", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Implement the foundational authorization infrastructure for FanEngagement by creating a centralized authorization service and custom authorization handlers. This enables policy-based authorization across all API endpoints.

This story is part of **Epic E-006: Security and Authorization Hardening**.

**Reference:** `docs/product/security-authorization-research-report.md`

---

## 2. Requirements

- Create `IAuthorizationService` interface in the Application layer
- Implement custom `IAuthorizationHandler` implementations for:
  - `OrgMemberRequirement` - validates user is a member of the organization
  - `OrgAdminRequirement` - validates user has OrgAdmin role in the organization
  - `ResourceOwnerRequirement` - validates user owns the requested resource
- Handlers must query `OrganizationMembership` for organization role checks
- GlobalAdmin role (`UserRole.Admin`) must bypass all organization-level checks
- Follow ASP.NET Core authorization patterns and conventions
- Follow existing backend layering (`Api → Application → Domain → Infrastructure`)

---

## 3. Acceptance Criteria (Testable)

- [ ] `IAuthorizationService` interface created in `FanEngagement.Application`
- [ ] `OrgMemberRequirement` class and handler implemented
- [ ] `OrgAdminRequirement` class and handler implemented
- [ ] `ResourceOwnerRequirement` class and handler implemented
- [ ] Handlers correctly query `OrganizationMembership` table
- [ ] GlobalAdmin users (`UserRole.Admin`) pass all organization checks
- [ ] Non-members fail `OrgMemberRequirement` checks
- [ ] Members without OrgAdmin role fail `OrgAdminRequirement` checks
- [ ] Unit tests added for each authorization handler
- [ ] Integration tests verify handler behavior with database
- [ ] All existing tests pass (`dotnet test`)

---

## 4. Constraints

- Do not modify existing controller authorization attributes yet (other stories will apply policies)
- Do not refactor unrelated code
- Maintain backward compatibility
- Follow naming and architectural conventions documented in `.github/copilot-coding-agent-instructions.md`
- Follow existing patterns in `FanEngagement.Infrastructure/Services/`

---

## 5. Technical Notes

**ASP.NET Core Authorization Pattern:**

```csharp
// Requirement class
public class OrgMemberRequirement : IAuthorizationRequirement
{
    // Can include properties if needed
}

// Handler class
public class OrgMemberHandler : AuthorizationHandler<OrgMemberRequirement>
{
    private readonly FanEngagementDbContext _dbContext;
    
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        OrgMemberRequirement requirement)
    {
        // Check if user is GlobalAdmin (bypass)
        // Get organizationId from route/resource
        // Query OrganizationMembership
        // context.Succeed(requirement) or fail silently
    }
}
```

**Key Files to Reference:**
- `backend/FanEngagement.Domain/Entities/OrganizationMembership.cs`
- `backend/FanEngagement.Domain/Entities/User.cs` (for `UserRole` enum)
- `backend/FanEngagement.Infrastructure/Data/FanEngagementDbContext.cs`
- `docs/architecture.md` → Authorization Model section

**Organization ID Extraction:**
- Organization ID may come from route parameters (`organizationId`, `orgId`)
- Organization ID may need to be looked up from related entity (e.g., proposal's organization)
- Consider using `IHttpContextAccessor` to access route data

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Application/**` (new interfaces)
- `backend/FanEngagement.Infrastructure/**` (new handlers)
- `backend/FanEngagement.Api/**` (DI registration)
- `backend/FanEngagement.Tests/**` (new tests)

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test the work (`dotnet build`, `dotnet test`)
- Notes on how to verify the handlers work correctly
- Confirmed adherence to architecture and authorization rules
