---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-36: Research regulatory implications of token issuance"
labels: ["development", "copilot", "blockchain", "compliance", "legal", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Research regulatory implications of token issuance so the platform operates within legal boundaries. This compliance research is critical for production launch.

This is a **research task** that produces documentation for legal review.

---

## 2. Requirements

- Research securities regulations for tokenized shares:
  - US (SEC, Howey Test)
  - EU (MiCA)
  - UK (FCA)
- Document jurisdiction-specific requirements
- Identify required disclaimers and terms
- Recommend legal review scope
- Define geographic restrictions if needed

---

## 3. Acceptance Criteria (Testable)

- [ ] Research securities regulations: US (SEC, Howey Test)
- [ ] Research securities regulations: EU (MiCA)
- [ ] Research securities regulations: UK (FCA)
- [ ] Document jurisdiction-specific requirements
- [ ] Identify required disclaimers and terms
- [ ] Recommend legal review scope
- [ ] Define geographic restrictions if needed
- [ ] Produce compliance research document in `docs/blockchain/`

---

## 4. Constraints

- **Legal/compliance research** - no production code changes
- Critical for production launch
- Requires external legal counsel review before final decisions
- Research only - does not constitute legal advice

---

## 5. Technical Notes (Optional)

- Howey Test: investment of money + common enterprise + expectation of profits + efforts of others
- MiCA (Markets in Crypto-Assets): EU regulation effective 2024
- FCA: UK Financial Conduct Authority guidance on crypto assets
- Consider: utility token vs. security token classification

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Blocks: Production mainnet deployment
- Priority: Now

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
- Compliance research document
- Recommended legal review scope
- Disclaimer that document is not legal advice
