---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-17: Record proposal lifecycle events on-chain"
labels: ["development", "copilot", "blockchain", "backend", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Record proposal lifecycle events on-chain so governance transitions are immutable and verifiable. This provides cryptographic proof of proposal state changes on the Solana blockchain.

---

## 2. Requirements

- Create `ISolanaGovernanceService` interface
- Implement `CommitProposalOpenAsync` method:
  - Create memo transaction with proposal data hash
  - Include: proposal ID, org ID, status, timestamp, content hash
- Implement `CommitProposalCloseAsync` method:
  - Include: results hash, winning option, total votes, quorum status
- Implement `CommitProposalFinalizeAsync` method
- Store transaction signatures on Proposal entity
- Integrate with existing ProposalService lifecycle methods
- Add retry logic for transient RPC failures
- Add unit and integration tests

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `ISolanaGovernanceService` interface
- [ ] Implement `CommitProposalOpenAsync` method with proposal data hash
- [ ] Implement `CommitProposalCloseAsync` method with results hash
- [ ] Implement `CommitProposalFinalizeAsync` method
- [ ] Store transaction signatures on Proposal entity
- [ ] Integrate with existing ProposalService lifecycle methods
- [ ] Add retry logic for transient RPC failures
- [ ] Unit tests with mocked Solana client
- [ ] Integration tests with local test validator
- [ ] All tests pass (`dotnet test`)

---

## 4. Constraints

- Must follow existing backend layering (`Api → Application → Domain → Infrastructure`)
- Consider using Solana Memo program for simple data commitment
- Blockchain failures should not block proposal state changes
- Must handle Solana RPC failures gracefully with retries

---

## 5. Technical Notes (Optional)

- Solana Memo program for simple data
- May require custom Solana program for structured data (future)
- Existing ProposalService: `backend/FanEngagement.Infrastructure/Services/ProposalService.cs`
- Hash format: SHA-256 of canonical JSON representation

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Depends on: E-004-07 (On-chain event model), E-004-13 (RPC client), E-004-15 (Key management), E-004-21 (Database migration)
- Dependency for: E-004-18 (Results commitment)

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
- backend/FanEngagement.Application/**
- backend/FanEngagement.Infrastructure/**
- backend/FanEngagement.Domain/**
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration test instructions (requires local validator)
- Retry behavior documentation
