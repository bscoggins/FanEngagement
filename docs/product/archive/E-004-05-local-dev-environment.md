---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-05: Set up local Solana development environment"
labels: ["development", "copilot", "blockchain", "devops", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Set up a local Solana development environment so developers can develop and test blockchain features locally without connecting to devnet or mainnet.

---

## 2. Requirements

- Document Solana CLI installation (solana, spl-token, anchor)
- Configure local test validator startup script
- Create airdrop script for local SOL funding
- Verify SPL token program availability on local validator
- Document common development workflows
- Add setup instructions to `docs/development.md`

---

## 3. Acceptance Criteria (Testable)

- [ ] Document Solana CLI installation (solana, spl-token, anchor)
- [ ] Create `scripts/solana-local-up.sh` to start test validator
- [ ] Create `scripts/solana-local-down.sh` to stop test validator
- [ ] Create airdrop script for local SOL funding
- [ ] Verify SPL token program availability on local validator
- [ ] Document common development workflows
- [ ] Add setup instructions to `docs/development.md`

---

## 4. Constraints

- Scripts should work on Linux and macOS
- Follow existing script patterns in `./scripts/` directory
- Avoid adding heavy dependencies to the main project
- Local validator should be isolated from real networks

---

## 5. Technical Notes (Optional)

- Solana CLI: `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`
- Local test validator: `solana-test-validator`
- Default RPC: http://localhost:8899
- SPL Token program is included in test validator by default

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Dependency for: E-004-06 (RPC client evaluation), E-004-13 (RPC client integration)

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
- scripts/**
- docs/development.md
- docs/blockchain/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to test the local validator setup
- Verification that SPL token program works locally
- Documentation updates for developer onboarding
