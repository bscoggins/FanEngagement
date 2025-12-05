---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-13: Capture audit events for voting"
labels: ["development", "copilot", "audit", "backend", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Capture audit events for voting activities to track vote casting for governance transparency. Must balance transparency needs with potential privacy concerns.

---

## 2. Requirements

- Audit vote cast events
- Include voter, proposal, and option information
- Record voting power used
- Consider privacy implications (configurable anonymization may be needed)

---

## 3. Acceptance Criteria (Testable)

- [ ] Audit: Vote cast
  - Details: voter user ID, proposal ID, selected option ID, voting power used
- [ ] Include relevant context:
  - Voter information (user ID, display name)
  - Proposal context (ID, title, organization)
  - Selected option (ID, text)
  - Voting power applied
- [ ] Consider privacy implications:
  - Document decision on voter identification in audit logs
  - Note if organization-level configuration for anonymization is needed (future)
- [ ] Integration tests for vote audit events
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering
- Use the `IAuditService` from E-005-05
- Minimal changes to existing voting logic
- Audit failures must not fail vote operations
- Balance transparency vs. privacy

---

## 5. Technical Notes (Optional)

**Existing Code:**

- `backend/FanEngagement.Infrastructure/Services/ProposalService.cs` (CastVoteAsync)
- `backend/FanEngagement.Api/Controllers/ProposalsController.cs`

**Vote Audit Details Example:**

```csharp
var details = new {
    VoterId = voter.Id,
    VoterName = voter.DisplayName,
    ProposalId = proposal.Id,
    ProposalTitle = proposal.Title,
    SelectedOptionId = option.Id,
    SelectedOptionText = option.Text,
    VotingPowerUsed = votingPower
};
```

**Privacy Considerations:**

- Current implementation logs voter identity
- Future enhancement: organization-configurable anonymization
- Document this decision in the audit event

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-05 (Audit service)
- Related to: E-005-12 (Proposal lifecycle auditing)

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
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration tests for vote audit events
- Documentation of privacy decision for voter identification
- All tests pass
