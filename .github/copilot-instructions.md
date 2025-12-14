# GitHub Copilot Chat — Project Instructions (FanEngagement)

These instructions tell GitHub Copilot **how to behave inside VS Code** when assisting with this repository.  
For full technical documentation, Copilot should reference `.github/copilot-coding-agent-instructions.md`.

---

## 1. Global Rules for All Interactions

- **Always create a plan first** before modifying files.  
- **Never delete code** unless explicitly instructed.  
- **Never introduce new external dependencies** without justification and approval.  
- **Prefer minimal diffs** and backward‑compatible changes.  
- **Ensure the build compiles** after suggested changes.  
- **Follow repository patterns** (backend layering, React frontend patterns).  
- **If schema changes occur**, create an EF migration.  
- **Ask clarifying questions** when requirements are unclear.  
- **Generate complete, ready‑to‑use code** when providing snippets.

---

## 2. What Copilot Should Reference for Context

When answering questions or generating changes, use:

- `.github/copilot-coding-agent-instructions.md` — full architecture rules for the Coding Agent that runs in GitHub
- `docs/architecture.md` — domain, lifecycle, authorization, governance  
- Backend folder structure for pattern matching  
- Frontend folder structure for routing and UI consistency  
- `FanEngagement.Tests` for test conventions  
- EF Core migrations folder for schema conventions  

Copilot should **follow existing patterns** instead of inventing new ones.

---

## 3. Project Overview (High‑Level)

FanEngagement is a multi‑tier system:

- **Backend**: .NET 9 Web API  
- **Database**: PostgreSQL + EF Core  
- **Frontend**: React 19 + TypeScript + Vite  
- **Authentication**: JWT with Admin, OrgAdmin, Member roles  
- **Governance**: proposals, votes, share types, balances  
- **Admin & Member portals**: role‑based routing and UI  

All changes must respect these patterns.

---

## 4. When User Requests Code Changes

Copilot Chat must:

1. **Restate the user’s request**  
2. **Propose a clear plan**  
3. **List the files that will be changed**  
4. **Implement the plan**  
5. Execute `docker compose build --no-cache` to ensure the build compiles.

**Example response:**

```text
Here is the plan:
1. Modify X file to add Y
2. Update Z service method
3. Add a new test in ...
```

---

## 5. Backend Guidance

Copilot must:

- Follow **API → Application → Domain → Infrastructure** layering  
- Use dependency injection with primary constructors  
- Include `CancellationToken` in async APIs  
- Use domain services (`ProposalGovernanceService`, `VotingPowerCalculator`)  
- Use structured logging  
- Use ProblemDetails error responses  
- Suggest tests using `WebApplicationFactory`  
- Create EF migrations when needed  

---

## 6. Frontend Guidance

Copilot must:

- Use existing API client modules instead of creating new ones  
- Use `usePermissions()`, `OrgAdminRoute`, `PlatformAdminRoute` consistently  
- Use established UI components:
  - `LoadingSpinner`
  - `ErrorMessage`
  - `EmptyState`
  - Notification system  
- Use `useAsync` where helpful  
- Use `data-testid` for new DOM elements  
- Follow the routing and layout patterns already in place  

### Organization Navigation Model

The application uses a centralized organization navigation model:

1. **Organization Switcher**: Located in the AdminLayout sidebar, allows users to switch between organizations they belong to.

2. **Role-based Navigation**: Navigation items appear/disappear based on the user's role in the currently selected organization:
   - **OrgAdmin role**: Shows full org admin sub-nav (Overview, Memberships, Share Types, Proposals, Webhook Events)
   - **Member role**: Shows message with link to member view, hides org admin tools

3. **Mixed-role Users**: Users who are OrgAdmin in one org and Member in another:
   - See all their organizations in the switcher
   - Get org admin tools when viewing their admin org
   - Get member-level view when viewing their member org
   - The sidebar dynamically updates based on selected org

4. **Navigation Configuration**: Defined in `frontend/src/navigation/navConfig.ts`:
   - Items have `scope` property: 'global', 'org', or 'user'
   - Items have `roles` property to control visibility
   - Org-scoped items only appear when user has OrgAdmin role for active org

---

## 7. What Copilot Should Avoid

- Creating new architectural patterns  
- Producing untested or untestable code  
- Adding npm/nuget dependencies without explicit approval  
- Mixing concerns between layers  
- Modifying EF migration history  
- Inventing domain rules  
- Suggesting nonstandard HTTP responses  
- Bypassing validation or authorization patterns  

---

## 8. Future Improvements Workflow

When the user asks to “log” an idea:

- Update `docs/future-improvements.md`  
- Add a new `###` heading  
- Provide a short description and optional bullets  
- Never place future ideas in random files or PRs  

---

## 9. Clarification Rules

Copilot must ask clarifying questions when:

- Requirements conflict or are ambiguous  
- Domain rules may be violated  
- A change affects database schema  
- A change affects authorization  
- A change affects multi‑org behavior  
- A change affects routing or major UI flows  

---

## 10. Summary

This file defines **how GitHub Copilot Chat behaves** inside VS Code:  

- Follow global rules  
- Use minimal diffs  
- Implement planned changes without requesting extra confirmation from the user
- Respect repository architecture  
- Reference deeper docs when needed  
Technical details live in `.github/copilot-coding-agent-instructions.md`.

---

## 11. Local Environment & Docker Reference

- `./scripts/dev-up` starts PostgreSQL via Docker Compose and then runs `dotnet watch` for the API; pass `--full` to also launch the Vite dev server so both ports (`5049`, `5173`) stay hot-reloading.
- `docker compose up --build` (or `-d --build`) brings up the production-style stack on ports `8080` (API) and `3000` (frontend); use this before Playwright or when reproducing CI.
- `docker compose up -d db` is the fastest way to ensure Postgres is available for backend tests or migrations without starting the whole stack.
- `docker compose down --remove-orphans` stops services while preserving volumes; add `-v` or run `./scripts/dev-down --clean` when you need a clean database.
- See `docs/development.md` for adapter-specific profiles (e.g., Solana) and for seeding/resetting dev data.
- **Blockchain adapters**: Both Solana (`adapters/solana`) and Polygon (`adapters/polygon`) live in this repo. They each have Dockerfiles plus their own `docker-compose.yml` for standalone work, but the root `docker-compose.yml` exposes them via ports `3001` (Solana) and `3002` (Polygon). Use Compose profiles so you only start what you need:
   - `docker compose --profile solana up -d solana-adapter` talks to Solana devnet by default; include `solana-test-validator` in the command if you need the local validator.
   - The Polygon adapter runs without a profile (starts with the default stack) and **requires** `POLYGON_PRIVATE_KEY`; set it in `.env.development` or export it before invoking Compose to avoid startup failures.
   - Both adapters read `API_KEY` for request authentication; keep development keys in `.env.development` (already gitignored) and never commit private keys.
   - Health endpoints: `http://localhost:3001/v1/adapter/health` (Solana) and `http://localhost:3002/v1/adapter/health`.

## 12. Testing & Troubleshooting Cheatsheet

**Backend**  
- Run `./scripts/test-backend [--verbose] [--filter "TestName"]` to build the solution and execute `FanEngagement.Tests` in Release mode.  
- If integration tests fail to connect, ensure Postgres is running (`docker compose up -d db`) or point the tests at the correct connection string.  
- For CI parity you can also run `docker compose --profile tests run --rm tests`.

**Frontend**  
- Run `./scripts/test-frontend [--watch] [--coverage]`; the script installs dependencies with `npm ci` if `node_modules` is missing.  
- Keep `VITE_API_BASE_URL` aligned with the backend host when snapshotting fixtures; `docs/development.md` lists the default values.

**End-to-End (Playwright)**  
- Prefer `./scripts/run-e2e.sh`, which loads `.env.development`, rebuilds the Compose stack (db, api, frontend), waits for health checks, resets dev data via `/admin/reset-dev-data`, and then executes `docker compose --profile e2e run --rm e2e`.  
- On success the script cleans up E2E artifacts; on failure it preserves state so you can inspect `frontend/test-results`, `frontend/playwright-report/index.html`, or run `npx playwright show-trace <trace.zip>`.  
- If the script times out waiting for services, check for lingering containers (`docker ps -a | grep fanengagement`) and rerun after `docker compose down -v`.

**Full unit suite**  
- `./scripts/run-tests.sh` orchestrates both `test-backend` and `test-frontend`, running backend first and then frontend. Pass `--backend-only` or `--frontend-only` when you need to focus on one side without remembering the individual commands. Use the underlying scripts directly if you need watch mode, coverage, or `dotnet test` filters.

**Adapters**  
- Solana adapter tests live under `adapters/solana/tests` and run with the package-level npm scripts; most integration tests expect either Solana devnet or the optional `solana-test-validator` Compose profile.  
- Polygon adapter tests live under `adapters/polygon/tests`; they require a funded Polygon Amoy testnet key (`POLYGON_PRIVATE_KEY`) plus `POLYGON_RPC_URL`.  
- When E2E or backend workflows need blockchain adapters, document whether the caller must start them (e.g., `docker compose --profile solana up -d solana-adapter`). If a change depends on adapter behavior, call out which adapter(s) to run and which env vars must be set.

**Solana Notes**
- The latest information on solana can be found at https://www.anza.xyz/.  Note that the old Solana github repo has been archived.
- Solana SDK is located at https://github.com/anza-xyz/solana-sdk.
- Always use the latest version of the Solana SDK for compatibility and security.
- Use Pinoccio for blockchain interactions.