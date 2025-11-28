---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-12: Design UX for blockchain verification links"
labels: ["development", "copilot", "blockchain", "ux", "design", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Design the UX for blockchain verification links so users can easily access Solana Explorer to verify on-chain records. The design should be subtle and non-intrusive for Web2 users while providing clear transparency benefits.

This is a **UX/Design task** that produces specifications.

---

## 2. Requirements

- Define visual indicator for blockchain-verified items (icon, badge)
- Define link placement on ShareType detail page
- Define link placement on Proposal detail page
- Define behavior when blockchain reference is pending/unavailable
- Define Solana Explorer URL patterns (devnet vs. mainnet)
- Produce UX mockups or specifications

---

## 3. Acceptance Criteria (Testable)

- [ ] Define visual indicator for blockchain-verified items (icon, badge)
- [ ] Define link placement on ShareType detail page
- [ ] Define link placement on Proposal detail page
- [ ] Define behavior when blockchain reference is pending/unavailable
- [ ] Define Solana Explorer URL patterns (devnet vs. mainnet)
- [ ] Produce UX mockups or specifications in `docs/blockchain/`

---

## 4. Constraints

- This is a UX/design task—no production code changes
- Output should be a markdown document with specifications in `docs/blockchain/`
- Design should be subtle/non-intrusive for Web2 users
- Follow existing frontend design patterns

---

## 5. Technical Notes (Optional)

- Solana Explorer URL patterns:
  - Mainnet: `https://explorer.solana.com/tx/{signature}`
  - Devnet: `https://explorer.solana.com/tx/{signature}?cluster=devnet`
- Consider: small chain icon, "Verified on Solana" text, tooltip with details
- Handle loading state when transaction is pending confirmation

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Dependency for: E-004-20 (Frontend implementation of Solana Explorer links)

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
- UX specification document
- Visual mockups or detailed descriptions
- State handling specifications (loading, error, success)
