---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-21: Add database migrations for blockchain fields"
labels: ["development", "copilot", "blockchain", "backend", "database", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Add EF Core database migrations to store Solana transaction and account references on existing entities. This enables the platform to track blockchain state alongside database state.

---

## 2. Requirements

- Create EF Core migration adding:
  - `ShareTypes.SolanaMintAddress` (varchar 64, nullable)
  - `ShareTypes.SolanaMintTransactionSignature` (varchar 128, nullable)
  - `ShareIssuances.SolanaTransactionSignature` (varchar 128, nullable)
  - `Proposals.SolanaAccountAddress` (varchar 64, nullable)
  - `Proposals.SolanaOpenTransactionSignature` (varchar 128, nullable)
  - `Proposals.SolanaCloseTransactionSignature` (varchar 128, nullable)
  - `Proposals.SolanaFinalizeTransactionSignature` (varchar 128, nullable)
- Add appropriate indexes for query patterns
- Test migration up and down
- Update entity classes with new properties

---

## 3. Acceptance Criteria (Testable)

- [ ] Create EF Core migration with all specified fields
- [ ] `ShareTypes` table: `SolanaMintAddress`, `SolanaMintTransactionSignature`
- [ ] `ShareIssuances` table: `SolanaTransactionSignature`
- [ ] `Proposals` table: `SolanaAccountAddress`, `SolanaOpenTransactionSignature`, `SolanaCloseTransactionSignature`, `SolanaFinalizeTransactionSignature`
- [ ] Add appropriate indexes for query patterns
- [ ] Test migration up and down
- [ ] Update entity classes with new properties
- [ ] All tests pass (`dotnet test`)

---

## 4. Constraints

- All new fields must be nullable (non-breaking change)
- Follow existing EF Core migration patterns
- Migration must be reversible (Down method)
- No data migration required (new fields only)

---

## 5. Technical Notes (Optional)

- Solana address: up to 44 characters (base58)
- Transaction signature: 88 characters (base58)
- Existing migrations in `backend/FanEngagement.Infrastructure/Migrations/`
- Entity classes in `backend/FanEngagement.Domain/Entities/`

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Depends on: E-004-11 (Data model design)
- Dependency for: E-004-16 (Token mint creation), E-004-17 (Proposal events)

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
- backend/FanEngagement.Domain/Entities/**
- backend/FanEngagement.Infrastructure/Migrations/**
- backend/FanEngagement.Infrastructure/FanEngagementDbContext.cs

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Migration verification commands
- Notes on applying migration to existing databases
