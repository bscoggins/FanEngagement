---
name: "Coding Task"
about: "Harden Voting APIs with proper authorization"
title: "[Dev] E-006-07: Harden Voting APIs"
labels: ["development", "copilot", "security", "T3", "critical"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Apply authorization policies to Voting API endpoints to prevent unauthorized voting. This addresses a **CRITICAL** security vulnerability where all voting endpoints currently have NO authorization, enabling anonymous voting and governance fraud.

This story is part of **Epic E-006: Security and Authorization Hardening**.

**Depends on:** E-006-01, E-006-02, E-006-03 (Authorization Infrastructure)

**Priority:** CRITICAL - This vulnerability enables anonymous voting and results manipulation.

---

## 2. Requirements

- `POST /proposals/{id}/votes` - Require OrgMember role AND voting power > 0
- `GET /proposals/{id}/votes/me` - Require authentication (user's own vote)
- `GET /users/{userId}/votes` - Require GlobalAdmin OR self-access
- Validate user has voting power > 0 in the organization before accepting vote
- Validate user is a member of the proposal's organization
- Return 401 Unauthorized for unauthenticated requests
- Return 403 Forbidden for unauthorized access attempts
- Return appropriate error when user lacks voting power

---

## 3. Acceptance Criteria (Testable)

- [ ] `POST /proposals/{id}/votes` returns 401 for unauthenticated users
- [ ] `POST /proposals/{id}/votes` returns 403 for non-members
- [ ] `POST /proposals/{id}/votes` returns appropriate error for members without voting power
- [ ] `POST /proposals/{id}/votes` succeeds for members with voting power > 0
- [ ] `POST /proposals/{id}/votes` succeeds for GlobalAdmin (if they're a member with voting power)
- [ ] `GET /proposals/{id}/votes/me` returns 401 for unauthenticated users
- [ ] `GET /proposals/{id}/votes/me` returns user's vote when authenticated
- [ ] `GET /users/{userId}/votes` returns 403 for non-self non-admin
- [ ] `GET /users/{userId}/votes` returns votes for self-access
- [ ] `GET /users/{userId}/votes` returns votes for GlobalAdmin
- [ ] Integration tests cover all role and voting power combinations
- [ ] All existing tests pass (`dotnet test`)

---

## 4. Constraints

- Do not change voting logic (one vote per user, voting power calculation)
- Do not change API request/response schemas
- Maintain backward compatibility for legitimate use cases
- Follow error response patterns (ProblemDetails format)
- Voting power validation may already exist in service layer - enhance, don't duplicate
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Current State (from architecture.md):**
```
| Cast vote | ⚠️ OPEN | No [Authorize] - anonymous access |
| View own vote | ⚠️ OPEN | No [Authorize] - anonymous access |
| View user's vote | ✅ PARTIAL | Checks self or Admin role |
```

**Target State:**
```
| Cast vote | ✅ ENFORCED | OrgMember with voting power > 0 |
| View own vote | ✅ ENFORCED | Authenticated user |
| View user's vote | ✅ ENFORCED | GlobalAdmin or self |
```

**Implementation Pattern:**

```csharp
[Authorize]
[HttpPost("{proposalId}/votes")]
public async Task<ActionResult<VoteDto>> CastVote(Guid proposalId, CastVoteRequest request)
{
    var currentUserId = GetCurrentUserId();
    var proposal = await _proposalService.GetAsync(proposalId);
    
    if (proposal == null)
    {
        return NotFound();
    }
    
    // Check membership in proposal's organization
    var membership = await _membershipService.GetByUserAndOrgAsync(
        currentUserId, 
        proposal.OrganizationId);
    
    if (membership == null)
    {
        return Forbid();
    }
    
    // Check voting power
    var votingPower = await _votingService.CalculateVotingPowerAsync(
        currentUserId, 
        proposal.OrganizationId);
    
    if (votingPower <= 0)
    {
        return BadRequest(new ProblemDetails
        {
            Title = "Insufficient Voting Power",
            Detail = "You must have voting power greater than 0 to cast a vote.",
            Status = 400
        });
    }
    
    // Proceed with vote (service layer has additional validation)
    return await _voteService.CastVoteAsync(proposalId, currentUserId, request);
}
```

**Voting Power Check:**
Per `docs/architecture.md`, voting power is calculated as:
```
VotingPower = Sum(ShareBalance.Balance × ShareType.VotingWeight)
```

The existing `VotingPowerCalculator` domain service should be used.

**Key Files to Modify:**
- `backend/FanEngagement.Api/Controllers/VotesController.cs` (or ProposalVotesController)
- `backend/FanEngagement.Api/Controllers/UsersController.cs` (if vote viewing is there)

**Key Files to Reference:**
- `docs/architecture.md` → Voting APIs section
- `docs/architecture.md` → Voting Eligibility section
- `backend/FanEngagement.Domain/Services/VotingPowerCalculator.cs`
- `backend/FanEngagement.Tests/` (existing test patterns)

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Api/Controllers/VotesController.cs`
- `backend/FanEngagement.Api/Controllers/ProposalVotesController.cs`
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
