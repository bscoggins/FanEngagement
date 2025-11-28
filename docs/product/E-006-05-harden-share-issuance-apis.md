---
name: "Coding Task"
about: "Harden Share Issuance APIs with proper authorization"
title: "[Dev] E-006-05: Harden Share Issuance APIs"
labels: ["development", "copilot", "security", "T3", "critical"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Apply authorization policies to Share Issuance API endpoints to prevent unauthorized share issuance. This addresses a **CRITICAL** security vulnerability where share issuance endpoints currently have NO authorization, allowing anonymous users to issue shares (voting power) to any account.

This story is part of **Epic E-006: Security and Authorization Hardening**.

**Depends on:** E-006-01, E-006-02, E-006-03 (Authorization Infrastructure)

**Priority:** CRITICAL - This vulnerability enables governance fraud through unauthorized voting power manipulation.

---

## 2. Requirements

- `POST /organizations/{orgId}/share-issuances` - Require OrgAdmin role
- `GET /organizations/{orgId}/share-issuances` - Require OrgMember role
- `GET /users/{userId}/share-balances` - Require GlobalAdmin, self-access, or OrgAdmin of user's organizations
- `GET /users/{userId}/share-issuances` - Require GlobalAdmin, self-access, or OrgAdmin of user's organizations
- Validate that target user is a member of the organization before allowing share issuance
- Return 401 Unauthorized for unauthenticated requests
- Return 403 Forbidden for unauthorized access attempts

---

## 3. Acceptance Criteria (Testable)

- [ ] `POST /organizations/{orgId}/share-issuances` returns 401 for unauthenticated users
- [ ] `POST /organizations/{orgId}/share-issuances` returns 403 for non-OrgAdmin users
- [ ] `POST /organizations/{orgId}/share-issuances` succeeds for OrgAdmin users
- [ ] `POST /organizations/{orgId}/share-issuances` succeeds for GlobalAdmin users
- [ ] Share issuance validates target user is member of organization
- [ ] `GET /organizations/{orgId}/share-issuances` returns 401 for unauthenticated users
- [ ] `GET /organizations/{orgId}/share-issuances` returns 403 for non-members
- [ ] `GET /organizations/{orgId}/share-issuances` succeeds for OrgMembers
- [ ] `GET /users/{userId}/share-balances` returns user's own balances
- [ ] `GET /users/{userId}/share-balances` returns 403 for viewing other user's balances (unless admin)
- [ ] Integration tests cover all role combinations
- [ ] All existing tests pass (`dotnet test`)

---

## 4. Constraints

- Do not change API request/response schemas
- Maintain backward compatibility for legitimate use cases
- Follow error response patterns (ProblemDetails format)
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Current State (from architecture.md):**
```
| Issue shares | ⚠️ OPEN | No [Authorize] - anonymous access |
| List share issuances | ⚠️ OPEN | No [Authorize] - anonymous access |
| View user share issuances | ⚠️ OPEN | No [Authorize] - anonymous access |
| View user share balances | ⚠️ OPEN | No [Authorize] - anonymous access |
```

**Target State:**
```
| Issue shares | ✅ ENFORCED | OrgAdmin only |
| List share issuances | ✅ ENFORCED | OrgMember |
| View user share issuances | ✅ ENFORCED | GlobalAdmin, self, or OrgAdmin |
| View user share balances | ✅ ENFORCED | GlobalAdmin, self, or OrgAdmin |
```

**Implementation Pattern:**

```csharp
// For OrgAdmin-only endpoints
[Authorize(Policy = "OrgAdmin")]
[HttpPost]
public async Task<ActionResult<ShareIssuanceDto>> IssueShares(
    Guid orgId, 
    CreateShareIssuanceRequest request)
{
    // Also validate target user is member of org
    var membership = await _membershipService.GetByUserAndOrgAsync(request.UserId, orgId);
    if (membership == null)
    {
        return BadRequest("Target user must be a member of the organization");
    }
    // ... proceed with issuance
}

// For OrgMember endpoints
[Authorize(Policy = "OrgMember")]
[HttpGet]
public async Task<ActionResult<List<ShareIssuanceDto>>> GetShareIssuances(Guid orgId)
```

**Balance/Issuance Viewing Logic:**

```csharp
[Authorize]
[HttpGet("{userId}/share-balances")]
public async Task<ActionResult<List<ShareBalanceDto>>> GetUserShareBalances(Guid userId)
{
    var currentUserId = GetCurrentUserId();
    
    // Self-access always allowed
    if (userId == currentUserId) 
    {
        return await _service.GetBalances(userId);
    }
    
    // GlobalAdmin can view any user
    if (User.IsInRole("Admin"))
    {
        return await _service.GetBalances(userId);
    }
    
    // OrgAdmin can view members of their orgs
    var isOrgAdminOfUser = await _membershipService.IsOrgAdminOfUser(currentUserId, userId);
    if (isOrgAdminOfUser)
    {
        return await _service.GetBalances(userId);
    }
    
    return Forbid();
}
```

**Key Files to Modify:**
- `backend/FanEngagement.Api/Controllers/ShareIssuancesController.cs`
- `backend/FanEngagement.Api/Controllers/UsersController.cs` (for balance endpoints if there)

**Key Files to Reference:**
- `docs/architecture.md` → Share Type, Issuance, Balances section
- `backend/FanEngagement.Tests/` (existing test patterns)

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Api/Controllers/ShareIssuancesController.cs`
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
