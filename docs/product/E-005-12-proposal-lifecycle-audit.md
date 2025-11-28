---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-12: Capture audit events for proposal lifecycle"
labels: ["development", "copilot", "audit", "backend", "proposals", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Capture audit events for all proposal lifecycle actions, ensuring that proposal governance is fully auditable. This is critical for governance transparency and trust.

---

## 2. Requirements

- Audit all proposal CRUD and lifecycle operations
- Include relevant details for each operation type
- Integrate with existing ProposalService without breaking changes
- No performance degradation on proposal operations

---

## 3. Acceptance Criteria (Testable)

- [ ] Audit: Proposal created
  - Details: title, description, organizationId, createdByUserId, startAt, endAt, quorumRequirement
- [ ] Audit: Proposal updated
  - Details: changed fields with before/after values
- [ ] Audit: Proposal opened (Draft → Open)
  - Details: eligibleVotingPowerSnapshot, transition timestamp
- [ ] Audit: Proposal closed (Open → Closed)
  - Details: winningOptionId, totalVotesCast, quorumMet, closedAt
- [ ] Audit: Proposal finalized (Closed → Finalized)
  - Details: finalizedAt
- [ ] Audit: Proposal option added
  - Details: optionId, optionText
- [ ] Audit: Proposal option deleted
  - Details: optionId, optionText, reason for deletion
- [ ] All audit events include:
  - Actor (user who performed action)
  - Organization context
  - Correlation ID
  - Timestamp
- [ ] Audit events are written after successful database commit
- [ ] Integration tests verify audit events are created for each operation
- [ ] No performance degradation (measure before/after)
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering
- Use the `IAuditService` from E-005-05
- Minimal changes to existing ProposalService methods
- Audit failures must not fail proposal operations

---

## 5. Technical Notes (Optional)

**Existing Code:**

- `backend/FanEngagement.Infrastructure/Services/ProposalService.cs`
- `backend/FanEngagement.Api/Controllers/ProposalsController.cs`
- `backend/FanEngagement.Api/Controllers/OrganizationProposalsController.cs`

**Integration Pattern:**

```csharp
public async Task<Proposal> CreateAsync(CreateProposalRequest request, CancellationToken ct)
{
    // ... existing creation logic ...
    await _dbContext.SaveChangesAsync(ct);

    // Audit after successful commit
    await _auditService.LogAsync(
        AuditEventBuilder.Create(AuditActionType.Created, AuditResourceType.Proposal)
            .WithActor(currentUserId, currentUserName, ipAddress)
            .WithResource(proposal.Id, proposal.Title)
            .WithOrganization(proposal.OrganizationId, org.Name)
            .WithDetails(new { proposal.Title, proposal.Description, proposal.StartAt, proposal.EndAt })
            .WithCorrelationId(correlationId)
            .WithOutcome(AuditOutcome.Success)
            .Build(),
        ct);

    return proposal;
}
```

**Status Change Pattern:**

```csharp
// For lifecycle transitions, include before/after status
.WithDetails(new {
    FromStatus = oldStatus.ToString(),
    ToStatus = newStatus.ToString(),
    EligibleVotingPower = proposal.EligibleVotingPowerSnapshot,
    // Include results for Close transition
    WinningOptionId = proposal.WinningOptionId,
    TotalVotesCast = proposal.TotalVotesCast,
    QuorumMet = proposal.QuorumMet
})
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-05 (Audit service)
- Related to: E-005-13 (Vote audit events)

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
- backend/FanEngagement.Infrastructure/Services/ProposalService.cs
- backend/FanEngagement.Api/Controllers/ProposalsController.cs
- backend/FanEngagement.Api/Controllers/OrganizationProposalsController.cs
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration tests for each audit event type
- Performance comparison (before/after audit logging)
- All tests pass
