---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-08: Design the token minting model"
labels: ["development", "copilot", "blockchain", "architecture", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Design the token minting model so that ShareTypes can be represented as SPL tokens on Solana. This architecture defines how the platform creates and manages token mints for each organization's share types.

This is an **architecture task** that produces documentation.

---

## 2. Requirements

- Define mint creation workflow (triggered by ShareType creation)
- Define mint address derivation (PDA based on org ID + share type ID)
- Define metadata content (name, symbol, description, org branding)
- Define authority structure (mint authority, freeze authority)
- Define decimals strategy (whole tokens vs. fractional)
- Document integration with existing ShareType service

---

## 3. Acceptance Criteria (Testable)

- [ ] Define mint creation workflow (triggered by ShareType creation)
- [ ] Define mint address derivation (PDA based on org ID + share type ID)
- [ ] Define metadata content (name, symbol, description, org branding)
- [ ] Define authority structure (mint authority, freeze authority)
- [ ] Define decimals strategy (whole tokens vs. fractional)
- [ ] Document integration with existing ShareType service
- [ ] Produce token minting model document in `docs/blockchain/`

---

## 4. Constraints

- This is an architecture/documentation task—no production code changes
- Output should be a markdown document in `docs/blockchain/`
- Must align with existing ShareType domain model
- Consider Metaplex Token Metadata for rich metadata

---

## 5. Technical Notes (Optional)

- Current ShareType fields: Name, Symbol, Description, VotingWeight, MaxSupply, IsTransferable
- SPL Token mint creation requires: decimals, mint authority, freeze authority
- PDA seeds could be: [org_id_bytes, share_type_id_bytes, "mint"]
- Token-2022 offers additional features if needed

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Depends on: E-004-03 (Tokenization strategy)
- Dependency for: E-004-16 (Create token mint per ShareType)

---

## 6. Desired Agent

Select one:

- [ ] **Default Coding Agent**
- [x] **docs-agent** (documentation only)
- [ ] **test-agent** (tests only)
- [ ] **lint-agent** (formatting / safe refactor only)
- [ ] **product-owner-agent** (idea → epic/story refinement; no code)

---

## 7. Files Allowed to Change

Allowed:
- docs/blockchain/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Token minting model document
- PDA derivation specification
- Integration points with existing services
