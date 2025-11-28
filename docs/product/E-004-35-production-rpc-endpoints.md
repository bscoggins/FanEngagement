---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-35: Select production RPC endpoints"
labels: ["development", "copilot", "blockchain", "infrastructure", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Select production RPC endpoints so the platform has reliable Solana connectivity. This operations task evaluates providers and implements failover for production deployment.

---

## 2. Requirements

- Evaluate RPC providers:
  - Helius
  - QuickNode
  - Triton
  - Public endpoints (rate limits, reliability)
- Select provider based on:
  - Reliability and uptime SLA
  - Rate limits and pricing
  - Geographic distribution
  - Feature support (getProgramAccounts, etc.)
- Configure failover to backup endpoints
- Implement circuit breaker for RPC failures
- Document operational procedures

---

## 3. Acceptance Criteria (Testable)

- [ ] Evaluate RPC providers (Helius, QuickNode, Triton, public)
- [ ] Selection criteria documented with recommendation
- [ ] Configure failover to backup endpoints
- [ ] Implement circuit breaker for RPC failures
- [ ] Document operational procedures
- [ ] All tests pass (`dotnet test`)

---

## 4. Constraints

- Operations/infrastructure task with implementation
- Cost and reliability implications must be documented
- Must not depend on single provider
- SLA requirements for production

---

## 5. Technical Notes (Optional)

- Helius: https://helius.dev/ - Good for webhooks, indexing
- QuickNode: https://quicknode.com/ - Multi-chain, good reliability
- Triton: https://triton.one/ - Solana-focused
- Public: https://api.mainnet-beta.solana.com - Rate limited
- Circuit breaker: Polly library pattern

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Required for: Production deployment
- Priority: Now (Pre-MVP Launch)

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
- backend/FanEngagement.Infrastructure/**
- backend/FanEngagement.Api/appsettings*.json
- docs/blockchain/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Provider evaluation document
- Failover configuration documentation
