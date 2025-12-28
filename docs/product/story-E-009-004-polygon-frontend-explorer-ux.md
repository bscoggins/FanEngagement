# [Dev] E-009-004: Frontend admin settings and explorer UX for Polygon

**Summary:** Extend frontend to surface Polygon as a blockchain option with explorer links and health visibility, mirroring Solana UX patterns.

**Primary Scope:** Frontend (Vite app)

## Requirements
- Add Polygon to organization blockchain selection with immutability rules identical to Solana.
- Validate required Polygon config fields and show inline errors.
- Render “View on PolygonScan” (or configured explorer) links on proposal and share type detail pages when Polygon hashes exist.
- Surface Polygon adapter health/metrics/webhook error states in admin observability views.
- Add Playwright/Cypress coverage for a Polygon-enabled org fixture.

## Acceptance Criteria
- [ ] Org settings show Polygon option and disable switching once shares/proposals exist, consistent with Solana UX.
- [ ] Explorer links appear only when Polygon transaction data is present and use correct network base URL.
- [ ] Admin Webhook Events (and related health panels) display Polygon adapter status alongside Solana.
- [ ] Tests cover UI states for Polygon-enabled org (happy path + missing config validation).
- [ ] No regression to existing Solana or None flows.

## Constraints & Guardrails
- Reuse existing UI components (navigation config, LoadingSpinner, ErrorMessage, etc.).
- No new frontend dependencies.
- Respect authorization and organization scoping patterns.

## Technical Notes / References
- `frontend/src/navigation/navConfig.ts` (blockchain options)
- Admin webhook/health pages for adapter observability
- Polygon explorer URL formatting (network-aware)

**Desired Agent:** frontend-agent (UI/UX and frontend polish)

**Files Allowed To Change:**
- frontend/**
- docs/**

## Completion Checklist
- [ ] Summary of all file changes
- [ ] Build & test commands shared
- [ ] Risks or migrations noted
- [ ] Architecture + authorization adherence confirmed
- [ ] Additional reviewer notes provided
