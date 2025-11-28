---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-19: Create backend service wrapping Solana interactions"
labels: ["development", "copilot", "blockchain", "backend", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Create a backend service that wraps Solana interactions so blockchain operations are abstracted from business logic. This core infrastructure service handles all low-level Solana RPC communication.

---

## 2. Requirements

- Create `SolanaService` implementing `ISolanaService`
- Implement methods:
  - `SubmitTransactionAsync(transaction)`
  - `GetTransactionStatusAsync(signature)`
  - `GetAccountInfoAsync(address)`
  - `BuildMemoTransaction(data)`
- Implement retry with exponential backoff
- Implement structured logging for all operations
- Add metrics for transaction success/failure rates
- Handle rate limiting from RPC provider
- Add comprehensive error handling

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `SolanaService` implementing `ISolanaService`
- [ ] Implement `SubmitTransactionAsync(transaction)` method
- [ ] Implement `GetTransactionStatusAsync(signature)` method
- [ ] Implement `GetAccountInfoAsync(address)` method
- [ ] Implement `BuildMemoTransaction(data)` method
- [ ] Implement retry with exponential backoff
- [ ] Implement structured logging for all operations
- [ ] Add metrics for transaction success/failure rates
- [ ] Handle rate limiting from RPC provider
- [ ] Comprehensive error handling with custom exceptions
- [ ] Unit tests with mocked RPC client
- [ ] All tests pass (`dotnet test`)

---

## 4. Constraints

- Must follow existing backend layering (`Api → Application → Domain → Infrastructure`)
- Pattern similar to existing webhook delivery service
- Use existing `FanEngagementMetrics` service for metrics
- Follow existing structured logging patterns

---

## 5. Technical Notes (Optional)

- Existing patterns: `WebhookDeliveryBackgroundService`, `OutboundEventService`
- Retry: Polly library or custom exponential backoff
- Metrics: `solana_transactions_total`, `solana_transaction_latency_seconds`
- Logging: Include transaction signature, operation type, error details

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Depends on: E-004-10 (Service architecture design), E-004-13 (RPC client integration)
- Dependency for: E-004-16, E-004-17 (Token and governance operations)

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
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Retry behavior documentation
- Metrics documentation
