# [Dev] E-009-005: Integration, contract, and E2E coverage for Polygon

**Summary:** Add cross-stack tests and harness updates to verify Polygon adapter compatibility with the shared blockchain contract and governance flows.

**Primary Scope:** Full Stack

## Requirements
- Add backend contract tests validating OpenAPI compatibility for Polygon adapter using shared fixtures/stubs.
- Update E2E harness (docker compose profile + scripts/run-e2e.sh) to optionally start Polygon adapter and seed a Polygon-enabled org.
- Define recording/replay strategy for Polygon RPC interactions to keep CI deterministic.
- Cover negative scenarios (invalid API key, insufficient gas, RPC timeout, adapter unreachable).

## Acceptance Criteria
- [ ] Contract tests assert Polygon adapter parity with Solana for all adapter endpoints.
- [ ] E2E workflow exercises share issuance and proposal lifecycle on Polygon and passes in CI without mainnet dependency.
- [ ] Replay/fixture mechanism documented and implemented to avoid live RPC flakiness.
- [ ] Negative-path tests exist for auth failure, gas error, timeout, and adapter offline cases.
- [ ] CI artifacts (logs/reports) clearly indicate Polygon coverage sections.

## Constraints & Guardrails
- Keep CI runtime reasonable; prefer mocked RPC or devnet replay data.
- Avoid duplicating test logic already covered for Solana—reuse fixtures/utilities where possible.
- No schema changes.

## Technical Notes / References
- `./scripts/run-e2e.sh` and docker compose profiles
- Solana adapter contract tests as reference
- Polygon adapter devnet configuration for deterministic runs

**Desired Agent:** Default coding agent

**Files Allowed To Change:**
- backend/FanEngagement.*/**
- adapters/polygon/**
- scripts/**
- docker-compose*.yml
- frontend/test-results/** (artifacts)

## Completion Checklist
- [ ] Summary of all file changes
- [ ] Build & test commands shared
- [ ] Risks or migrations noted
- [ ] Architecture + authorization adherence confirmed
- [ ] Additional reviewer notes provided
