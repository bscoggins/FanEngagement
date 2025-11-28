---
name: "Coding Task"
about: "Harden Proposal APIs with proper authorization"
title: "[Dev] E-006-06: Harden Proposal APIs"
labels: ["development", "copilot", "security", "T3", "critical"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Apply authorization policies to Proposal API endpoints to prevent unauthorized proposal access and manipulation. This addresses a **CRITICAL** security vulnerability where all proposal endpoints currently have NO authorization, allowing anonymous users to create, view, update, and manage proposals.

This story is part of **Epic E-006: Security and Authorization Hardening**.

**Depends on:** E-006-01, E-006-02, E-006-03 (Authorization Infrastructure)

**Priority:** CRITICAL - This vulnerability enables governance manipulation and proposal hijacking.

---

## 2. Requirements

- `POST /organizations/{orgId}/proposals` - Require OrgMember role
- `GET /organizations/{orgId}/proposals` - Require OrgMember role
- `GET /proposals/{id}` - Require OrgMember of proposal's organization
- `PUT /proposals/{id}` - Require OrgAdmin OR proposal creator
- `POST /proposals/{id}/open` - Require OrgAdmin OR proposal creator
- `POST /proposals/{id}/close` - Require OrgAdmin OR proposal creator
- `POST /proposals/{id}/finalize` - Require OrgAdmin OR GlobalAdmin
- `POST /proposals/{id}/options` - Require OrgAdmin OR proposal creator
- `DELETE /proposals/{id}/options/{optionId}` - Require OrgAdmin OR proposal creator
- `GET /proposals/{id}/results` - Require OrgMember role
- Return 401 Unauthorized for unauthenticated requests
- Return 403 Forbidden for unauthorized access attempts

---

## 3. Acceptance Criteria (Testable)

- [ ] `POST /organizations/{orgId}/proposals` returns 401 for unauthenticated users
- [ ] `POST /organizations/{orgId}/proposals` returns 403 for non-members
- [ ] `POST /organizations/{orgId}/proposals` succeeds for OrgMembers
- [ ] `GET /organizations/{orgId}/proposals` returns 401 for unauthenticated users
- [ ] `GET /organizations/{orgId}/proposals` returns 403 for non-members
- [ ] `GET /organizations/{orgId}/proposals` succeeds for OrgMembers
- [ ] `GET /proposals/{id}` returns 403 for non-members of proposal's org
- [ ] `PUT /proposals/{id}` returns 403 for non-creator non-OrgAdmin
- [ ] `PUT /proposals/{id}` succeeds for proposal creator
- [ ] `PUT /proposals/{id}` succeeds for OrgAdmin
- [ ] Lifecycle endpoints (open/close/finalize) enforce creator/OrgAdmin rule
- [ ] Option management endpoints enforce creator/OrgAdmin rule
- [ ] Integration tests cover all role combinations
- [ ] All existing tests pass (`dotnet test`)

---

## 4. Constraints

- Do not change API request/response schemas
- Do not modify proposal governance logic (state transitions, voting rules)
- Maintain backward compatibility for legitimate use cases
- Follow error response patterns (ProblemDetails format)
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Current State (from architecture.md):**
```
| Create proposal | ⚠️ OPEN | No [Authorize] - anonymous access |
| List proposals by org | ⚠️ OPEN | No [Authorize] - anonymous access |
| View proposal | ⚠️ OPEN | No [Authorize] - anonymous access |
| Update proposal | ⚠️ OPEN | No [Authorize] - anonymous access |
| Close proposal | ⚠️ OPEN | No [Authorize] - anonymous access |
| Add proposal option | ⚠️ OPEN | No [Authorize] - anonymous access |
| Delete proposal option | ⚠️ OPEN | No [Authorize] - anonymous access |
| View proposal results | ⚠️ OPEN | No [Authorize] - anonymous access |
```

**Target State:**
```
| Create proposal | ✅ ENFORCED | OrgMember |
| List proposals by org | ✅ ENFORCED | OrgMember |
| View proposal | ✅ ENFORCED | OrgMember of proposal's org |
| Update proposal | ✅ ENFORCED | Creator or OrgAdmin |
| Close proposal | ✅ ENFORCED | Creator or OrgAdmin |
| Add proposal option | ✅ ENFORCED | Creator or OrgAdmin |
| Delete proposal option | ✅ ENFORCED | Creator or OrgAdmin |
| View proposal results | ✅ ENFORCED | OrgMember |
```

**Implementation Pattern for Creator/OrgAdmin Check:**

```csharp
[Authorize]
[HttpPut("{id}")]
public async Task<ActionResult<ProposalDto>> UpdateProposal(Guid id, UpdateProposalRequest request)
{
    var currentUserId = GetCurrentUserId();
    var proposal = await _proposalService.GetAsync(id);
    
    if (proposal == null)
    {
        return NotFound();
    }
    
    // Check if GlobalAdmin (bypass)
    if (User.IsInRole("Admin"))
    {
        return await _proposalService.UpdateAsync(id, request);
    }
    
    // Check if OrgAdmin or Creator
    var isOrgAdmin = await _membershipService.IsOrgAdminAsync(currentUserId, proposal.OrganizationId);
    var isCreator = proposal.CreatedByUserId == currentUserId;
    
    if (!isOrgAdmin && !isCreator)
    {
        return Forbid();
    }
    
    return await _proposalService.UpdateAsync(id, request);
}
```

**Using ProposalManager Policy:**

```csharp
// If using policy-based approach
[Authorize(Policy = "ProposalManager")]
[HttpPut("{id}")]
public async Task<ActionResult<ProposalDto>> UpdateProposal(...)
```

**Key Files to Modify:**
- `backend/FanEngagement.Api/Controllers/OrganizationProposalsController.cs`
- `backend/FanEngagement.Api/Controllers/ProposalsController.cs`
- `backend/FanEngagement.Api/Controllers/ProposalOptionsController.cs`

**Key Files to Reference:**
- `docs/architecture.md` → Proposal & Voting APIs section
- `docs/architecture.md` → Proposal Governance Rules section
- `backend/FanEngagement.Tests/` (existing test patterns)

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Api/Controllers/OrganizationProposalsController.cs`
- `backend/FanEngagement.Api/Controllers/ProposalsController.cs`
- `backend/FanEngagement.Api/Controllers/ProposalOptionsController.cs`
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
