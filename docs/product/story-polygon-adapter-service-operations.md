# [Dev] Polygon adapter service operations (container) at feature parity

**Summary:** Implement Polygon adapter container endpoints with ERC-20 semantics matching the Solana adapter contract, including health and metrics.

**Primary Scope:** DevOps / Tooling

## Requirements
- Expose `/v1/adapter/*`, `/health`, and `/metrics` endpoints with Polygon implementations for organization bootstrap, share mint creation, share issuance, proposal lifecycle commitments, and vote/result commitments.
- Enforce API key auth and secret handling consistent with Solana adapter.
- Provide Docker Compose profile and environment defaults for local devnet usage.
- Add unit/integration tests for each endpoint, covering gas estimation, nonce handling, and retries.

## Acceptance Criteria
- [ ] All adapter endpoints respond with schemas compatible with Solana client expectations (OpenAPI parity).
- [ ] API key enforcement, logging redaction, and structured errors mirror Solana adapter behavior.
- [ ] Local Docker Compose profile launches Polygon adapter with documented env vars (`POLYGON_RPC_URL`, `POLYGON_PRIVATE_KEY`, `API_KEY`).
- [ ] Tests cover success paths plus transient RPC errors, insufficient gas, and nonce conflicts with idempotent retry handling.
- [ ] `/health` and `/metrics` expose readiness/liveness data consumed by backend monitoring.

## Constraints & Guardrails
- No new libraries beyond those already used in adapters.
- Keep secrets out of logs; follow existing Solana logging patterns.
- Avoid mainnet dependencies for automated tests; prefer devnet or mocked RPC.

## Technical Notes / References
- `adapters/polygon/README.md`
- Solana adapter endpoints as parity reference
- `docs/blockchain/adapter-platform-architecture.md`

**Desired Agent:** Default coding agent

**Files Allowed To Change:**
- adapters/polygon/**
- docker-compose*.yml
- docs/blockchain/**

## Completion Checklist
- [ ] Summary of all file changes
- [ ] Build & test commands shared
- [ ] Risks or migrations noted
- [ ] Architecture + authorization adherence confirmed
- [ ] Additional reviewer notes provided
