---
name: "Coding Task"
about: "Harden User Management APIs with proper authorization"
title: "[Dev] E-006-04: Harden User Management APIs"
labels: ["development", "copilot", "security", "T3", "critical"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Apply authorization policies to User Management API endpoints to prevent unauthorized access to user data. This addresses a **CRITICAL** security vulnerability where any authenticated user can currently list, view, update, and delete ANY user in the system.

This story is part of **Epic E-006: Security and Authorization Hardening**.

**Depends on:** E-006-01, E-006-02, E-006-03 (Authorization Infrastructure)

**Priority:** CRITICAL - This is a security vulnerability that enables privilege escalation.

---

## 2. Requirements

- `GET /users` - Require GlobalAdmin role
- `GET /users/{id}` - Require GlobalAdmin OR self-access (user viewing own profile)
- `PUT /users/{id}` - Require GlobalAdmin OR self-access; role changes require GlobalAdmin only
- `DELETE /users/{id}` - Require GlobalAdmin role
- `GET /users/me/organizations` - Require authentication only (no change)
- `GET /users/{id}/memberships` - Require GlobalAdmin OR self-access
- Return 403 Forbidden for unauthorized access attempts
- Prevent any user from changing their own role (must be GlobalAdmin to change roles)

---

## 3. Acceptance Criteria (Testable)

- [ ] `GET /users` returns 403 for non-GlobalAdmin users
- [ ] `GET /users` returns user list for GlobalAdmin users
- [ ] `GET /users/{id}` returns 403 for non-GlobalAdmin viewing other users
- [ ] `GET /users/{id}` returns user data when viewing own profile
- [ ] `GET /users/{id}` returns user data for GlobalAdmin viewing any user
- [ ] `PUT /users/{id}` returns 403 for non-GlobalAdmin updating other users
- [ ] `PUT /users/{id}` allows users to update own profile (except role)
- [ ] `PUT /users/{id}` prevents role changes unless GlobalAdmin
- [ ] `DELETE /users/{id}` returns 403 for non-GlobalAdmin users
- [ ] `DELETE /users/{id}` succeeds for GlobalAdmin users
- [ ] Integration tests cover all role combinations
- [ ] All existing tests pass (`dotnet test`)

---

## 4. Constraints

- Do not modify user creation endpoint (remains open for registration)
- Do not change API request/response schemas
- Maintain backward compatibility for legitimate use cases
- Follow error response patterns (ProblemDetails format)
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Current State (from architecture.md):**
```
| List all users | ⚠️ AUTH-ONLY | - any authenticated user can list |
| View any user | ⚠️ AUTH-ONLY | - any authenticated user can view |
| Update any user | ⚠️ AUTH-ONLY | - CRITICAL RISK: any authenticated user can update |
| Delete any user | ⚠️ AUTH-ONLY | - any authenticated user can delete |
```

**Target State:**
```
| List all users | ✅ ENFORCED | GlobalAdmin only |
| View any user | ✅ ENFORCED | GlobalAdmin or self |
| Update any user | ✅ ENFORCED | GlobalAdmin or self (role changes GlobalAdmin only) |
| Delete any user | ✅ ENFORCED | GlobalAdmin only |
```

**Implementation Pattern:**

```csharp
// For GlobalAdmin-only endpoints
[Authorize(Policy = "GlobalAdmin")]
[HttpGet]
public async Task<ActionResult<PagedResult<UserDto>>> GetUsers(...)

// For self-or-admin endpoints
[Authorize]
[HttpGet("{id}")]
public async Task<ActionResult<UserDto>> GetUser(Guid id)
{
    var currentUserId = GetCurrentUserId();
    if (id != currentUserId && !User.IsInRole("Admin"))
    {
        return Forbid();
    }
    // ... proceed with request
}
```

**Preventing Self-Role Changes:**

```csharp
[HttpPut("{id}")]
public async Task<ActionResult<UserDto>> UpdateUser(Guid id, UpdateUserRequest request)
{
    var currentUserId = GetCurrentUserId();
    
    // Check basic access (self or admin)
    if (id != currentUserId && !User.IsInRole("Admin"))
    {
        return Forbid();
    }
    
    // Prevent non-admin from changing roles
    if (request.Role.HasValue && !User.IsInRole("Admin"))
    {
        return Forbid(); // or BadRequest with message
    }
    
    // ... proceed with update
}
```

**Key Files to Modify:**
- `backend/FanEngagement.Api/Controllers/UsersController.cs`

**Key Files to Reference:**
- `docs/architecture.md` → User Management APIs section
- `backend/FanEngagement.Tests/AuthorizationIntegrationTests.cs` (existing test patterns)

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Api/Controllers/UsersController.cs`
- `backend/FanEngagement.Tests/**` (new/updated tests)

Optional:
- `docs/architecture.md` (update enforcement status)

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test the work (`dotnet build`, `dotnet test`)
- List of all authorization changes made
- Test results showing authorization is enforced
- Confirmed adherence to architecture and authorization rules
