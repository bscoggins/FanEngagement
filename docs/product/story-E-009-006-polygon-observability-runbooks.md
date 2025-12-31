# [Dev] E-009-006: Polygon observability, alerts, and runbooks

**Summary:** Extend observability and operational guardrails for Polygon adapter, matching Solana practices for metrics, alerts, webhooks, and runbooks.

**Primary Scope:** DevOps / Tooling

## Requirements
- Emit health/metrics compatible with existing dashboards; define alerts for error rate, pending tx backlog, and RPC latency.
- Ensure webhook events include Polygon identifiers (chain id, tx hash, adapter instance) and render correctly in Admin Webhook Events UI.
- Document runbook for common Polygon failures (nonce conflicts, gas spikes, RPC rate limits) with recovery steps.
- Redact private keys/API keys in logs; align sampling with Solana adapter.

## Acceptance Criteria
- [x] Metrics/health endpoints expose Polygon-specific labels and are scraped by existing monitoring stack.
- [x] Alert definitions created/updated for Polygon adapter failure modes.
- [x] Admin Webhook Events and related dashboards display Polygon metadata without UI regressions.
- [x] Runbook added under docs with troubleshooting and escalation paths for Polygon incidents.
- [x] Logging verified to omit secrets and follow structured format.

## Constraints & Guardrails
- Reuse existing observability stack and patterns; no new monitoring vendors.
- Keep documentation concise and actionable for on-call engineers.
- Avoid code changes that alter governance behavior.

## Technical Notes / References
- Admin webhook events UI and backend pipeline
- Solana adapter monitoring configuration as template
- `docs/blockchain/adapter-platform-architecture.md`

**Desired Agent:** Default coding agent

**Files Allowed To Change:**
- adapters/polygon/**
- docs/**
- deployment/ops/monitoring configs (if present)

## Completion Checklist
- [x] Summary of all file changes
- [x] Build & test commands shared
- [x] Risks or migrations noted
- [x] Architecture + authorization adherence confirmed
- [x] Additional reviewer notes provided
