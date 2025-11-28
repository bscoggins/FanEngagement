---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-18: Commit proposal results hash to Solana"
labels: ["development", "copilot", "blockchain", "backend", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Commit proposal results hash to Solana so governance outcomes are cryptographically verifiable. This enables external parties to verify that reported results match the on-chain commitment.

---

## 2. Requirements

- Define results hash format (SHA-256 of canonical results JSON)
- Compute results hash when proposal closes
- Commit hash to Solana via memo or custom program
- Store results hash and transaction signature
- Provide verification endpoint to compare on-chain vs. database hash
- Add tests for hash computation and verification

---

## 3. Acceptance Criteria (Testable)

- [ ] Define results hash format (SHA-256 of canonical results JSON)
- [ ] Compute results hash when proposal closes
- [ ] Commit hash to Solana via memo or custom program
- [ ] Store results hash and transaction signature on Proposal entity
- [ ] Provide verification endpoint to compare on-chain vs. database hash
- [ ] Unit tests for hash computation
- [ ] Integration tests for verification endpoint
- [ ] All tests pass (`dotnet test`)

---

## 4. Constraints

- Must follow existing backend layering (`Api → Application → Domain → Infrastructure`)
- Hash format must be deterministic (canonical JSON serialization)
- Builds on E-004-17 (Proposal lifecycle events)
- Verification endpoint should be publicly accessible

---

## 5. Technical Notes (Optional)

- Canonical JSON: sorted keys, no whitespace
- SHA-256 for hash computation
- Results include: winning option ID, total votes, quorum status, vote counts per option
- Verification: `GET /proposals/{id}/verify-blockchain`

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Depends on: E-004-17 (Proposal lifecycle events)
- Enables: External audit capability

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
- backend/FanEngagement.Api/**
- backend/FanEngagement.Application/**
- backend/FanEngagement.Infrastructure/**
- backend/FanEngagement.Domain/**
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Hash format specification
- Verification endpoint documentation
