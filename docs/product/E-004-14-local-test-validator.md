---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-14: Configure local test validator for development"
labels: ["development", "copilot", "blockchain", "devops", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Configure local Solana test validator for development so developers can test blockchain features locally without connecting to devnet or mainnet.

---

## 2. Requirements

- Create `scripts/solana-local-up.sh` to start test validator
- Create `scripts/solana-local-down.sh` to stop test validator
- Configure test validator with SPL token program
- Create airdrop script for local wallet funding
- Update Docker Compose for optional Solana validator container
- Document local setup in `docs/development.md`

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `scripts/solana-local-up.sh` to start test validator
- [ ] Create `scripts/solana-local-down.sh` to stop test validator
- [ ] Configure test validator with SPL token program
- [ ] Create airdrop script for local wallet funding
- [ ] Update Docker Compose for optional Solana validator container
- [ ] Document local setup in `docs/development.md`
- [ ] Scripts work on Linux and macOS

---

## 4. Constraints

- Follow existing script patterns in `./scripts/` directory
- Docker Compose changes should be optional (profile-based)
- Scripts must be idempotent and safe to run multiple times
- No changes to production infrastructure

---

## 5. Technical Notes (Optional)

- `solana-test-validator` command to start local validator
- Default RPC: http://localhost:8899
- Airdrop: `solana airdrop 100 <address> --url http://localhost:8899`
- SPL Token program included by default in test validator

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Depends on: E-004-05 (Local dev environment setup)
- Dependency for: E-004-23 (Integration tests)

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
- docker-compose.yml
- docs/development.md
- docs/blockchain/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to test the local validator setup
- Verification steps for SPL token program
- Documentation updates
