# GitHub Copilot Coding Agent Guide — FanEngagement

This guide provides all operational instructions for the GitHub Copilot Coding Agent, including:

- Global rules that apply to every agent
- Specialized agent definitions and boundaries
- Repository architecture and tooling overview
- Required workflows for backend, frontend, authorization, testing, observability, and CI
- Patterns the agent must follow when implementing features, fixes, docs, or tests

This file is the primary behavioral contract for all Copilot agents.

---

## 1. Global Rules for All Copilot Agents

These rules apply to every Copilot agent working in this repository, including default agents and specialized agents (docs-agent, test-agent, lint-agent).

### 1.1 Safety, Scope, and Minimal-Risk Changes

- Prefer small, targeted, reversible changes.
- Avoid broad refactors unless explicitly requested.
- Maintain backward compatibility unless explicitly permitted.
- Never introduce new frameworks, libraries, or architectural patterns without instruction.

### 1.2 Architectural Consistency

- Follow the layering structure of the backend (Api → Application → Domain → Infrastructure).
- Follow established React + TypeScript conventions in the frontend.
- Respect dependency boundaries.
- Align with domain services such as ProposalGovernanceService for proposal logic.

### 1.3 Testing Requirements

- Ensure backend tests pass (dotnet test).
- Ensure frontend tests pass (npm test / Playwright if required).
- Never modify production code to satisfy a flawed test.
- Create tests for all new logic, states, and edge cases.
- Treat all test failures as relevant to your changes unless explicitly marked as pre-existing in the request.
- You are not done until there are 0 test failures. Fix all failures, even if they appear unrelated to your changes.

### 1.4 Documentation Requirements

- Update documentation in the same PR when behavior changes.
- Keep architecture docs aligned with code.
- Ensure code comments (C# XML, TS JSDoc) reflect current behavior.

### 1.5 Security and Secrets

- Never commit secrets or tokens.
- Use placeholders and instruct humans where secrets must be passed.

### 1.6 Pull Request Quality

Each PR must include:

- What changed
- Why it changed
- How to test (commands + steps)
- Risk analysis
- Summary of all added/modified files

### 1.7 Specialized Agent Boundaries

- If a requested change exceeds your specialization, say so.
- docs-agent: documentation only
- test-agent: tests only
- lint-agent: formatting/refactor-only and behavior-preserving

### 1.8 Error Handling & Logging

- Follow centralized exception handling.
- Never add controller try/catch blocks.
- Use structured logging when touching backend logic.

### 1.9 Analytical Responsibility

Before changing code, analyze:

- architecture docs
- domain rules
- existing patterns and DTOs
- surrounding tests

---

## 2. Completion & Handoff Rules

Once the task is complete:

- Stop modifying files.
- Summarize all changes.
- Provide explicit build/test instructions.
- Provide any required follow-up tasks.

---

## 3. Standard Issue Template for the Coding Agent

Issues assigned to the coding agent should follow this format:

```text
#github-pull-request_copilot-coding-agent
```

Title: <meaningful title>

Body:

- Scope:
- Requirements:
- Constraints:
- Testing:
- Completion Criteria:

---

## 4. Specialized Agents

Four custom agents exist. Their detailed role definitions live in:

- agent.md
- .github/agents/*.agent.md

### 4.1 docs-agent

- Writes/updates docs, READMEs, architecture, comments.
- Does not modify runtime logic.

### 4.2 test-agent

- Creates backend xUnit tests, frontend Vitest tests, Playwright E2E.
- May identify bugs; behavior changes must be minimal and isolated.

### 4.3 lint-agent

- Applies formatting, cleanup, and safe refactors.
- Must not change behavior.

### 4.4 frontend-agent

- Expert in React/Vite UI implementation, visual systems, and accessibility.
- Handles layout refinements, theming, motion, and UX polish across the frontend only.
- Must respect design tokens, performance budgets, and responsive breakpoints.

All specialized agents must obey the Global Rules.

---

## 5. Repository Overview (Backend + Frontend Structure)

Backend Solution Structure:

- FanEngagement.Api (ASP.NET Core controllers)
- FanEngagement.Application (interfaces, DTOs, validators)
- FanEngagement.Domain (entities, enums, domain services)
- FanEngagement.Infrastructure (EF Core, persistence, services)
- FanEngagement.Tests (xUnit tests)

Frontend:

- React 19 + TypeScript + Vite
- Vitest unit tests, Playwright E2E
- Strong permission model and route guards

Blockchain adapters (under `/adapters`):

- `adapters/solana` — Node 20 service using @solana/web3.js. Comes with its own Dockerfile and optional `solana-test-validator` profile. Exposes port `3001`, requires `SOLANA_PRIVATE_KEY` (or keypair path) and `API_KEY`.
- `adapters/polygon` — Node 20 service using ethers.js. Exposes port `3002`, requires `POLYGON_PRIVATE_KEY`, `POLYGON_RPC_URL`, and `API_KEY`. Runs as part of the default Compose stack unless you remove/disable it.
- Both adapters follow the shared adapter OpenAPI contract and expose `/v1/adapter/*` endpoints plus `/health` and `/metrics` for observability.

Runtime:

- .NET 9
- Postgres via Docker Compose
- Automatic migrations applied at startup

---

## 6. Local Build/Test/Run Instructions (Agent Must Follow)

### 6.1 Docker Compose

```sh
docker compose up --build
docker compose up -d db
docker compose down --remove-orphans
docker compose down -v
```

- `docker compose up --build` (or `-d --build`) brings up the production-style stack on ports `8080` (API) and `3000` (frontend) and is what CI uses before Playwright.
- `docker compose up -d db` is the quickest way to ensure PostgreSQL is running for migrations or tests without starting the whole stack.
- `docker compose down --remove-orphans` stops services while preserving data; add `-v` when you explicitly want to wipe the database.
- The Solana adapter, Polygon adapter, and test runners sit behind Compose profiles—reference `docs/development.md` when you need to enable them.
- To run blockchain adapters locally:
  - `docker compose --profile solana up -d solana-adapter` targets Solana devnet; add `solana-test-validator` to that command (and export `SOLANA_PRIVATE_KEY`) when you need deterministic runs.
  - The Polygon adapter participates in the default profile and therefore starts with `docker compose up`; ensure `POLYGON_PRIVATE_KEY` (or `POLYGON_PRIVATE_KEY_PATH`) plus `POLYGON_RPC_URL` are present in `.env.development` or your shell, otherwise the container will exit on boot.
  - Both adapters read `API_KEY` for request authentication; never bake real secrets into Compose files.

### 6.2 Backend

```sh
dotnet build backend/FanEngagement.sln
dotnet test backend/FanEngagement.Tests
```

### 6.3 Frontend

```sh
cd frontend
npm ci
npm run build
npm test
```

---

## 7. Development Scripts

The repo includes scripts in ./scripts/ which the agent may reference.

Examples:

```sh
./scripts/dev-up
./scripts/dev-down
./scripts/test-backend
./scripts/test-frontend
./scripts/run-tests.sh
./scripts/run-e2e.sh
```

- `./scripts/dev-up` starts PostgreSQL (via Compose) and runs `dotnet watch` for the API; pass `--full` to also launch the Vite dev server so both ports hot-reload. Use this for day-to-day development where you want fast rebuilds instead of containers.
- `./scripts/dev-down` stops the Compose services that `dev-up` created; add `--clean` (or use `docker compose down -v`) to drop volumes for a clean database when tests require a fresh state.
- `./scripts/test-backend [--verbose] [--filter TestName]` builds the solution and executes `FanEngagement.Tests` in Release mode so failures match CI logging.
- `./scripts/test-frontend [--watch|--coverage]` runs Vitest; the helper runs `npm ci` automatically the first time to match CI’s dependency tree.
- `./scripts/run-tests.sh [--backend-only|--frontend-only]` is a thin orchestrator that runs backend tests first and then frontend tests, matching the order used in CI gates; use it for quick local pre-flight checks when you do not need watch mode.
- `./scripts/run-e2e.sh` loads `.env.development`, rebuilds the Compose stack (db, api, frontend), waits for health checks, resets dev data, runs Playwright inside the `e2e` profile, and only cleans up data when the suite passes.

---

## 8. Authorization Model (Agent Must Respect When Modifying Backend)

FanEngagement uses a two-tier role model:

- Global roles: User / Admin
- Organization roles: Member / OrgAdmin

Policies:

- GlobalAdmin
- OrgMember
- OrgAdmin
- ProposalManager

Rules:

- Admins bypass org-level checks.
- OrgAdmin required for writes.
- OrgMember required for viewing org data.
- Proposal transitions must use ProposalGovernanceService.

The agent must apply correct authorization attributes on new endpoints.

---

## 9. Organization Workflow Requirements

Organization creation:

- Only GlobalAdmins may create organizations.
- Creator becomes OrgAdmin automatically.
- Stored transactionally.
- Must update corresponding frontend pages and permissions.

---

## 10. Multi-Organization Frontend Context Rules

The agent must follow:

- Use useActiveOrganization() hook
- Respect stored organization context
- Use route-based org selection when applicable
- Apply branding via useOrgBranding()

---

## 11. Frontend Permission Model

The agent must:

- Use route guards (AdminRoute, OrgAdminRoute, ProtectedRoute)
- Use usePermissions() for conditional UI
- Use IfGlobalAdmin, IfOrgAdmin, IfOrgMember components

Unauthorized UI paths must not be exposed.

---

## 12. Proposal Lifecycle & Governance

The agent must:

- Use domain services for all lifecycle changes
- Never set proposal status manually
- Ensure snapshot, quorum, voting power logic is correct
- Maintain architecture rules

Transitions:

- Draft → Open → Closed → Finalized

---

## 13. Instructions for Backend Feature Implementation

### 13.1 API Pattern

1. Define controller action in Api
2. Add/modify Application interfaces/DTOs
3. Update Domain logic if needed
4. Update Infrastructure services
5. Add validators
6. Add or update tests
7. Document changes

The agent must follow this sequence.

---

## 14. Instructions for Frontend Feature Implementation

### 14.1 Standard Page Requirements

- Use LoadingSpinner
- Use ErrorMessage (+ retry)
- Use EmptyState where appropriate
- Use user notifications
- Handle async button state

### 14.2 API Integration

- Use apiClient wrappers
- Ensure new API endpoints exist and match backend

### 14.3 Routes & Guards

- Must use correct route tree (/platform-admin, /admin, /me)

---

## 15. EF Core Migrations

Agent must:

- Create migrations for model changes
- Include migration files in PR
- Use correct startup project in commands

---

## 16. Testing Strategy

### 16.1 Backend

- Integration tests must use WebApplicationFactory
- Prefer deterministic data dependencies

### 16.2 Frontend

- Unit tests: Vitest + RTL
- E2E: Playwright
- Avoid brittle selectors; use test IDs as needed

### 16.3 Command Reference & Troubleshooting

#### Backend tests

- Preferred command: `./scripts/test-backend [--verbose] [--filter "Namespace.Test"]`. The script performs a Release build (catching compile problems early) and then runs `dotnet test` against `FanEngagement.Tests` with any filter/verbosity you pass through.
- If tests fail with connection errors, bring Postgres online via `docker compose up -d db` (or run the stack through `./scripts/dev-up`) before re-running.
- For parity with CI, you can execute `docker compose --profile tests run --rm tests`, which launches the same container used in pipelines.

#### Frontend tests

- Use `./scripts/test-frontend [--watch] [--coverage]`. On the first run the helper executes `npm ci` to guarantee the same dependency graph as CI; afterward it proxies any Vitest CLI flags.
- Watch mode is ideal for component work, but make sure to run the plain command before pushing so cached snapshots reset. If tests reference API data, align `VITE_API_BASE_URL` with the backend host you are hitting.

#### End-to-end tests (Playwright)

- Run `./scripts/run-e2e.sh` for the full workflow. It loads `.env.development` when present, builds the Compose images, starts db/api/frontend, waits for `/health/live` and the Vite host, logs in as the seeded admin, calls `/admin/reset-dev-data`, and then executes `docker compose --profile e2e run --rm e2e` so tests run inside the Playwright container.
- When the suite passes the script triggers `/admin/cleanup-e2e-data`; when it fails it intentionally keeps containers and data running for inspection. Review artifacts under `frontend/test-results` or open `frontend/playwright-report/index.html`. Trace zips can be viewed with `npx playwright show-trace frontend/test-results/<test>/trace.zip`.
- If the script appears stuck waiting for services, check for lingering containers (`docker ps -a | grep fanengagement`) and rerun after `docker compose down --remove-orphans` (add `-v` if the database must be wiped).

#### Full unit suite

- Use `./scripts/run-tests.sh` when you need to run backend and frontend unit tests back-to-back (the script prints clear section headers so failures are easy to spot). Pass `--backend-only` or `--frontend-only` to gate a subset, and drop to the underlying scripts if you need extra flags like watch mode or coverage.

#### Blockchain adapters

- Each adapter has its own npm scripts: `cd adapters/solana` (or `/polygon`) and run `npm test`, `npm run test:integration`, etc. Keep `npm ci` in sync with committed lockfiles before running.
- Solana integration tests require either the devnet RPC (`SOLANA_RPC_URL=https://api.devnet.solana.com`) or the optional `solana-test-validator` Compose profile. Provide a funded `SOLANA_PRIVATE_KEY` (JSON array) or `SOLANA_KEYPAIR_PATH` plus `API_KEY`.
- Polygon integration tests require `POLYGON_RPC_URL` (Amoy recommended) and a funded `POLYGON_PRIVATE_KEY`. Get test MATIC from https://faucet.polygon.technology/ before running.
- Both adapters expose `/v1/adapter/health` and `/v1/adapter/metrics`; remind developers to verify those endpoints when troubleshooting blockchain issues.

---

## 17. Observability Requirements

Agent must add structured logging for:

- Proposal transitions
- Background services
- External API calls

Metrics rules:

- Use counters ending with _total
- Use tags (success, event_type, organization_id)

---

## 18. Background Services Requirements

Agent must:

- Add structured logs to background services
- Instrument operations with metrics
- Respect cancellation tokens
- Avoid heavy synchronous IO

---

## 19. Pagination and Filtering Requirements

Agent must:

- Add pagination (page, pageSize) for all new list endpoints
- Add filters where applicable
- Ensure backward compatibility
- Add integration and frontend tests

---

## 20. Coding Conventions

- Controllers stay thin
- Domain logic stays in Domain services
- App logic in Application
- Infra handles persistence only
- Naming: PascalCase types, camelCase locals

---

## 21. Documentation & OpenAPI

Agent must:

- Maintain OpenAPI annotations
- Document changed endpoints in PRs

---

## 22. How to Trigger the Copilot Coding Agent

Include this hashtag in an issue or comment:

`#github-pull-request_copilot-coding-agent`

Provide clear scope, requirements, constraints, and testing needs.

---

## 23. Centralized Navigation Configuration

### 23.1 Core Rules

- **Single Source of Truth**: Define all navigation items in `frontend/src/navigation/navConfig.ts`. Never hardcode sidebar links.
- **Layout Integration**: Rely on `AdminLayout` and `PlatformAdminLayout` to automatically render items from config.
- **Role-Based Visibility**: Control access via `roles` (PlatformAdmin, OrgAdmin, Member) and `scope` (global, org, user).

### 23.2 Implementation Patterns

- **Adding Items**: Add `NavItem` objects to `navConfig.ts` with unique `id`, `path`, and `order`.
- **Consuming Config**: Use `useNavigation()` hook to access resolved items and home routes.
- **Filtering**: Use `getVisibleNavItems(context, filter)` for custom lists.
- **Testing**: Add visibility tests in `navConfig.test.ts` for every new item.

### 23.3 Routing Logic

- **Home Route**: Use `getDefaultHomeRoute()` for landing logic (PlatformAdmin → `/platform-admin/dashboard`, OrgAdmin → `/admin`, Member → `/me/home`).
- **Redirects**: Ensure `routeUtils.ts` logic mirrors navigation config for post-login redirects.

### 23.4 Organization-Level Navigation

The admin area uses a centralized organization navigation model with the following behavior:

#### Organization Switcher

- Located in the `AdminLayout` sidebar
- Shows all organizations where the user has any membership (OrgAdmin or Member)
- Displays role indicator next to each org name (e.g., "Org Name (Admin)" or "Org Name (Member)")
- When switching orgs:
  - If user is OrgAdmin for new org → navigates to org admin overview (`/admin/organizations/:orgId/edit`)
  - If user is Member for new org → navigates to member view (`/me/organizations/:orgId`)

#### Org Admin Sub-Navigation

When user is OrgAdmin for the selected organization, the sidebar shows:

- Overview (organization settings)
- Memberships
- Share Types
- Proposals
- Webhook Events

These items are defined with `scope: 'org'` in navConfig and only appear when:

1. An active organization is selected
2. User has OrgAdmin role (or PlatformAdmin) for that organization

#### Role Badge

- Shows "Org Admin" or "Member" badge below the org selector
- Instantly reflects the user's role when switching organizations

#### Mixed-Role Users

Users who are OrgAdmin in one org and Member in another:

- See ALL their organizations in the switcher
- Get full org admin tools when admin org is selected
- Get member-level message + link when member org is selected
- Navigation instantly updates when switching

#### Page Layout for Org Admin Pages

- Remove ad-hoc "Back to Organizations" links from org admin pages
- Use consistent sidebar navigation for moving between org admin sections
- Page headings should be simple (e.g., "Memberships" not "Manage Memberships")
