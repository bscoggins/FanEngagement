---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-16: Create SPL token mint per ShareType"
labels: ["development", "copilot", "blockchain", "backend", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Implement SPL token mint creation for each ShareType so that organization shares are represented as on-chain tokens. This enables verifiable ownership and sets the foundation for future token functionality.

---

## 2. Requirements

- Create `ISolanaTokenService` interface with `CreateMintAsync` method
- Implement mint creation with:
  - Deterministic mint address (PDA based on org ID + share type ID)
  - Platform wallet as mint authority
  - Appropriate decimals (0 for whole shares)
- Add metadata using Metaplex Token Metadata program
- Store mint address and transaction signature on ShareType entity
- Handle idempotency (don't recreate existing mints)
- Add unit tests with mocked Solana client
- Add integration test with local test validator

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `ISolanaTokenService` interface with `CreateMintAsync` method
- [ ] Implement mint creation with deterministic PDA address
- [ ] Platform wallet set as mint authority
- [ ] Appropriate decimals (0 for whole shares)
- [ ] Add metadata using Metaplex Token Metadata program
- [ ] Store mint address and transaction signature on ShareType entity
- [ ] Handle idempotency (don't recreate existing mints)
- [ ] Unit tests with mocked Solana client
- [ ] Integration test with local test validator
- [ ] All tests pass (`dotnet test`)

---

## 4. Constraints

- Must follow existing backend layering (`Api → Application → Domain → Infrastructure`)
- Modify ShareTypeService to call Solana service after database commit
- Blockchain operation should not block database operations
- Must handle Solana RPC failures gracefully

---

## 5. Technical Notes (Optional)

- SPL Token: `Solnet.Programs.TokenProgram`
- Metaplex Token Metadata for rich metadata
- PDA seeds: `[org_id.ToByteArray(), share_type_id.ToByteArray(), "mint"]`
- Token decimals: 0 (whole tokens only)

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Depends on: E-004-08 (Token minting model), E-004-13 (RPC client), E-004-15 (Key management), E-004-21 (Database migration)
- Dependency for: Token issuance functionality

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
- Notes on idempotency handling
