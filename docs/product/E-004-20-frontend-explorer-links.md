---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-20: Add Solana Explorer links to frontend"
labels: ["development", "copilot", "blockchain", "frontend", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Add Solana Explorer links to the frontend so users can verify blockchain records. This provides transparency by allowing users to see on-chain verification of shares and proposals.

---

## 2. Requirements

- Create `SolanaExplorerLink` React component
- Accept props: transaction signature or account address
- Generate correct URL for configured network (devnet/mainnet)
- Display subtle icon/badge (e.g., chain link icon)
- Handle null/pending blockchain references gracefully
- Add to ShareType detail page
- Add to Proposal detail page
- Add unit tests for component

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `SolanaExplorerLink` React component
- [ ] Accept props: transaction signature or account address
- [ ] Generate correct URL for configured network (devnet/mainnet)
- [ ] Display subtle icon/badge (e.g., chain link icon)
- [ ] Handle null/pending blockchain references gracefully
- [ ] Add to ShareType detail page
- [ ] Add to Proposal detail page
- [ ] Unit tests for component
- [ ] All tests pass (`npm test`)

---

## 4. Constraints

- Use existing frontend component patterns
- Follow existing styling conventions
- Must be subtle/non-intrusive for Web2 users
- Handle loading and error states appropriately

---

## 5. Technical Notes (Optional)

- Solana Explorer URLs:
  - Mainnet: `https://explorer.solana.com/tx/{signature}`
  - Devnet: `https://explorer.solana.com/tx/{signature}?cluster=devnet`
  - Account: `https://explorer.solana.com/address/{address}`
- Consider: small chain icon, "Verified on Solana" tooltip
- Network configuration from environment variable

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Depends on: E-004-12 (UX design for verification links)
- Requires backend: E-004-16, E-004-17 (to have blockchain references to display)

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
- frontend/src/components/**
- frontend/src/pages/**
- frontend/src/test/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`npm run build`, `npm test`)
- Screenshot of component in different states
- Network configuration documentation
