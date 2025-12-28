# [Dev] Polygon adapter client & factory parity

**Summary:** Implement the Polygon adapter client and factory routing with full parity to the Solana implementation, ensuring all blockchain operations route correctly when `BlockchainType=Polygon`.

**Primary Scope:** Backend (Api/Application/Domain/Infrastructure)

## Requirements
- Implement `PolygonAdapterClient` (or equivalent) that conforms to the shared blockchain adapter contract.
- Wire `IBlockchainAdapterFactory` to route Polygon requests without impacting Solana/None code paths.
- Validate Polygon configuration (adapter URL, network, API key) and error when misconfigured.
- Mirror Solana auth/retry/timeout behaviors in HTTP client policies.
- Add contract/integration tests covering happy path and failure modes with Polygon stubs.

## Acceptance Criteria
- [ ] `PolygonAdapterClient` implements the same interface as Solana client, including auth headers and resilience policies.
- [ ] Selecting `BlockchainType=Polygon` routes organization, share, proposal, and vote operations through the Polygon client.
- [ ] Invalid/missing Polygon config fails fast with ProblemDetails aligned to existing validation patterns.
- [ ] Contract/integration tests cover success + error cases using Polygon adapter stubs, matching Solana coverage depth.
- [ ] No regressions to Solana or Null adapter behaviors (verified by tests).

## Constraints & Guardrails
- Do not introduce new architectural patterns or dependencies beyond existing Solana approach.
- Preserve existing circuit breaker, timeout, and retry policies.
- Avoid schema changes; reuse existing blockchain configuration fields.

## Technical Notes / References
- `docs/architecture.md#blockchain-adapter-platform`
- `backend` adapter factory wiring used for Solana client
- Solana adapter contract tests as parity reference

**Desired Agent:** Default coding agent

**Files Allowed To Change:**
- backend/FanEngagement.*/**
- adapters/polygon/**
- docs/blockchain/**

## Completion Checklist
- [ ] Summary of all file changes
- [ ] Build & test commands shared
- [ ] Risks or migrations noted
- [ ] Architecture + authorization adherence confirmed
- [ ] Additional reviewer notes provided
