# [Dev] Governance event wiring to Polygon operations

**Summary:** Route governance events (org/share/proposal/vote) to Polygon adapter when `BlockchainType=Polygon`, matching Solana behavior without regressions.

**Primary Scope:** Backend (Api/Application/Domain/Infrastructure)

## Requirements
- Invoke Polygon adapter for organization creation, share type creation, share issuance, proposal open/close/finalize, and vote/result commitments.
- Reuse existing resilience policies (retry, timeout, circuit breaker) and ProblemDetails responses.
- Emit Polygon explorer transaction references for downstream UI.
- Add automated tests for dual-chain behavior (None/Solana/Polygon).

## Acceptance Criteria
- [ ] All governance operations call Polygon adapter paths when the organization is configured for Polygon; other blockchain types remain unchanged.
- [ ] Failure handling mirrors Solana path with consistent user-facing errors and logging.
- [ ] Transaction references returned to application/domain layer include chain id and tx hash for Polygon.
- [ ] Tests cover None/Solana/Polygon permutations without duplicating Solana-only fixtures.
- [ ] No unauthorized cross-org leakage; authorization rules unchanged.

## Constraints & Guardrails
- No schema changes; reuse existing blockchain fields.
- Maintain layered architecture (Api → Application → Domain → Infrastructure).
- Do not alter governance rules or voting power calculations.

## Technical Notes / References
- `docs/architecture.md#blockchain-adapter-platform`
- Existing Solana wiring in application services as reference
- Admin webhook events flow for surfacing adapter failures

**Desired Agent:** Default coding agent

**Files Allowed To Change:**
- backend/FanEngagement.*/**
- adapters/polygon/**
- frontend/** (only for DTO/contract alignment if required)

## Completion Checklist
- [ ] Summary of all file changes
- [ ] Build & test commands shared
- [ ] Risks or migrations noted
- [ ] Architecture + authorization adherence confirmed
- [ ] Additional reviewer notes provided
