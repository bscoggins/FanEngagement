# GitHub Copilot Agent Guide — FanEngagement

This document tells GitHub Copilot Agent exactly how to work on this repository inside GitHub (create branches, implement changes, run builds/tests, and open PRs) with minimal back-and-forth.

## Completion & Handoff Rules

- When the required code, pages, services, and tests are complete:
  - Stop making further changes.
  - Summarize all added/modified files.
  - Provide explicit instructions for the human reviewer (build/test steps).

## Standard Task Template

Each new issue for the GitHub Copilot Coding Agent should follow this structure:

#github-pull-request_copilot-coding-agent
Title: <meaningful title>

Body:
- Scope:
    <What must be built, modified, or added>
- Requirements:
    <Backend/frontend details, architectural rules, API routes, DTOs, validation, UI behaviors>
- Constraints:
    <Authorization rules, multi-tenancy, environments, dependencies>
- Testing:
    <Unit tests, integration tests, frontend tests>
- Completion:
    - All builds succeed (backend + frontend)
    - All tests pass
    - New API endpoints/routes/forms documented in the PR
    - Update `copilot-instructions.md`
    - Update `copilot-coding-agent-instructions.md`

## Repository Overview

- Solution: `backend/FanEngagement.sln`

- Projects:
   - API: `backend/FanEngagement.Api` (ASP.NET Core, controllers under `Controllers/`)
   - Application: `backend/FanEngagement.Application` (interfaces, DTOs/requests)
   - Domain: `backend/FanEngagement.Domain` (entities, enums)
   - Infrastructure: `backend/FanEngagement.Infrastructure` (EF Core DbContext, migrations, service implementations)
   - Tests: `backend/FanEngagement.Tests` (xUnit integration/unit tests)
   - Frontend: `frontend/` (React 19 + TypeScript, Vite dev, Nginx in production)

- Runtime:
   - Target framework: .NET `net9.0`
   - Database: EF Core (migrations under `backend/FanEngagement.Infrastructure/Persistence/Migrations`)
   - OpenAPI in Development (`/swagger` when in Development mode)

## Local Build, Test, and Run

Preferred: Docker Compose (matches CI and local stack).

```sh
# Start API + DB (Postgres) + Frontend and follow logs
docker compose up --build

# API:      http://localhost:8080
# Frontend: http://localhost:3000
```

Run tests via Docker Compose:

```sh
# Start DB (in background) then run tests in container
docker compose up -d db
docker compose run --rm tests dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release

# Tear down when done
docker compose down -v
```

Alternative (bare dotnet): ensure a Postgres instance is running and reachable via `ConnectionStrings__DefaultConnection` (see `appsettings*.json`). All paths are relative to repo root `FanEngagement/`.

```sh
# Build solution
dotnet build backend/FanEngagement.sln --configuration Release

# Run tests (xUnit)
dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release --logger "trx;LogFileName=test-results.trx"

# Run API locally (Development profile, http://localhost:5049)
dotnet run --project backend/FanEngagement.Api/FanEngagement.Api.csproj --launch-profile http

# Frontend (dev server)
cd frontend
npm ci
echo "VITE_API_BASE_URL=http://localhost:5049" > .env.development
npm run dev   # http://localhost:5173
```

Notes:

- The API sets `ASPNETCORE_ENVIRONMENT=Development` by default when run with the `http`/`https` profiles.
- The Development HTTP URL (bare dotnet) is `http://localhost:5049` (see `backend/FanEngagement.Api/Properties/launchSettings.json`).
- The Docker Compose API URL is `http://localhost:8080` (see `docker-compose.yml`).
- On startup the API applies pending EF Core migrations automatically.
- The Docker Compose frontend URL is `http://localhost:3000`. The frontend build uses `VITE_API_BASE_URL=/api` (see line 41 of `docker-compose.yml`). The frontend container proxies `/api` requests to the backend, enabling same-origin API calls and avoiding CORS issues.
- JWT settings must be provided: set `Jwt__Issuer`, `Jwt__Audience`, and `Jwt__SigningKey` (secure, non-empty). Compose uses env vars; override `JWT_SIGNING_KEY` in `.env` or CI secrets.
- Startup throws if any JWT Issuer/Audience/SigningKey values are missing or empty (validated in `Program.cs`).
- Development auto-seeds an admin user (`admin@example.com`) or elevates existing user to Admin; update/remove for production.
- If `Cors:AllowedOrigins` not set, CORS defaults to `http://localhost:3000` and `http://localhost:5173`.

## Current API Endpoints

- Health:
   - `GET /health` → `{ "status": "ok" }`
- Auth & Users:
   - `POST /auth/login` → JWT login
   - `POST /users` → Create user
   - `GET /users` → List users
   - `GET /users/{id}` → Get user by ID
   - `PUT /users/{id}` → Update user
   - `DELETE /users/{id}` → Delete user
- Organizations & Memberships:
   - `POST /organizations` → Create organization
   - `GET /organizations` → List organizations
   - `GET /organizations/{id}` → Get organization by ID
   - `GET /organizations/{organizationId}/memberships` → List memberships
   - `POST /organizations/{organizationId}/memberships` → Add membership
   - `GET /organizations/{organizationId}/memberships/{userId}` → Get membership by user
   - `DELETE /organizations/{organizationId}/memberships/{userId}` → Remove membership
- Share Types & Issuances:
   - `POST /organizations/{organizationId}/share-types` → Create share type
   - `GET /organizations/{organizationId}/share-types` → List share types
   - `POST /organizations/{organizationId}/share-issuances` → Create share issuance
   - `GET /organizations/{organizationId}/share-issuances` → List share issuances
   - `GET /organizations/{organizationId}/users/{userId}/share-issuances` → List user share issuances
   - `GET /organizations/{organizationId}/users/{userId}/balances` → Get user share balances
- Proposals & Voting:
   - `POST /organizations/{organizationId}/proposals` → Create proposal
   - `GET /organizations/{organizationId}/proposals` → List proposals by organization
   - `GET /proposals/{proposalId}` → Get proposal by ID
   - `PUT /proposals/{proposalId}` → Update proposal
   - `POST /proposals/{proposalId}/close` → Close proposal
   - `POST /proposals/{proposalId}/options` → Add proposal option
   - `DELETE /proposals/{proposalId}/options/{optionId}` → Delete proposal option
   - `POST /proposals/{proposalId}/votes` → Cast vote
   - `GET /proposals/{proposalId}/results` → Get results
- Webhooks & Outbound Events:
   - `POST /organizations/{organizationId}/webhooks` → Create webhook endpoint
   - `GET /organizations/{organizationId}/webhooks` → List webhook endpoints
   - `GET /organizations/{organizationId}/webhooks/{webhookId}` → Get webhook endpoint
   - `PUT /organizations/{organizationId}/webhooks/{webhookId}` → Update webhook endpoint
   - `DELETE /organizations/{organizationId}/webhooks/{webhookId}` → Delete webhook endpoint
   - `GET /organizations/{organizationId}/outbound-events` → List outbound events (filter by status/type)
   - `GET /organizations/{organizationId}/outbound-events/{eventId}` → Get outbound event details
   - `POST /organizations/{organizationId}/outbound-events/{eventId}/retry` → Retry outbound event
- Admin & Dev Utilities:
   - `POST /admin/seed-dev-data` → Seed development data (Development only, Admin role required)
   - `GET /users/admin/stats` → Basic user statistics (Admin role required)

Controllers live in `backend/FanEngagement.Api/Controllers/` and call services defined in `Application` and implemented in `Infrastructure/Services`.

## How To Ask Copilot Agent To Work

Use the GitHub Copilot coding agent by adding a comment containing the hashtag below to a new or existing issue, or by opening a conversation and concluding with the hashtag. The agent will create a branch, implement changes, and open a PR.

```text
#github-pull-request_copilot-coding-agent
```

When you trigger the agent, include:

- A precise task description and acceptance criteria.
- Any constraints (backward compatibility, performance, security, API shape).
- Which projects/files to touch if relevant.

Example task prompt:

```md
#github-pull-request_copilot-coding-agent
Title: Add DELETE /organizations/{id}
Body:
- Add endpoint in `OrganizationsController` to delete an organization by id.
- Add service method `DeleteAsync(Guid id, CancellationToken)` and implementation.
- Return 204 when deleted; 404 when not found.
- Add xUnit tests covering success and not-found cases.
- Ensure build + tests pass.
```

Example frontend task prompt:

```md
#github-pull-request_copilot-coding-agent
Title: Add Users list page
Body:
- Add protected route `/users` in `frontend/src/routes/`.
- Implement `UsersPage` to fetch from `GET /users` via `usersApi.getAll()`.
- Show a basic table (name, email) with delete action calling `DELETE /users/{id}`.
- Wire with `AuthContext` and `ProtectedRoute` to require login.
- Add Vitest tests for `UsersPage` rendering and API call mock.
- Ensure `npm run build` and `npm test` pass in `frontend/`.
```

## Branching, Commits, and PRs (for Agent)

- Branch name: `agent/<short-task-slug>` (e.g., `agent/delete-organization`).
- Commits: small, descriptive; use conventional style where natural, e.g., `feat(api): add DELETE /organizations/{id}`.
- PR title: concise and actionable; PR description must include:
  - What changed and why
  - Affected areas and risks
  - How to test (commands + steps)
  - Checklist status (below)

PR readiness checklist:

- [ ] Builds successfully: `dotnet build backend/FanEngagement.sln`
- [ ] All tests pass: `dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj`
- [ ] Frontend builds and tests pass (if touched): `npm ci && npm run build && npm test` in `frontend/`
- [ ] New/changed endpoints documented in PR body
- [ ] Migrations added/updated when modifying persistence
- [ ] No breaking public API changes without explicit approval

## Code Change Workflow (Agent)

When implementing a feature or endpoint, follow this flow:

1. API contract
   - Define/confirm route, verb, request/response models.
   - Add controller action under `backend/FanEngagement.Api/Controllers`.
2. Application layer
   - Add or extend interfaces/requests in `backend/FanEngagement.Application` (e.g., `Organizations`, `ShareTypes`).
3. Domain layer
   - Add/update entities and enums in `backend/FanEngagement.Domain` as needed.
4. Infrastructure layer
   - Implement services in `backend/FanEngagement.Infrastructure/Services`.
   - Update EF Core mappings in `backend/FanEngagement.Infrastructure/Persistence/Configurations`.
   - If persistence shape changes, add a migration (see below).
5. Tests
   - Add/extend tests in `backend/FanEngagement.Tests` (xUnit).
   - Prefer integration tests using `WebApplicationFactory<Program>` for API behavior.
6. Wire-up & validation
   - Ensure DI is configured via `backend/FanEngagement.Infrastructure/DependencyInjection.cs`.
   - Build, run tests, sanity check locally.

### Frontend Changes (Agent)

When implementing a frontend feature:

1. Routes & Pages
   - Add/update route in `frontend/src/routes/`.
   - Add/update page components in `frontend/src/pages/` and shared components in `frontend/src/components/`.
2. API Integration
   - Add/update `frontend/src/api/*Api.ts` using the shared `apiClient` (Axios).
   - Ensure backend endpoints exist and are documented.
3. Auth
   - Use `AuthContext` and `ProtectedRoute` for protected pages.
4. Env
   - Ensure `VITE_API_BASE_URL` is set appropriately for dev/prod.
5. Tests
   - Add/extend tests with Vitest + Testing Library.
6. Build/Verify
   - `npm run build` locally; for Compose, `docker compose up --build frontend`.

## EF Core Migrations

When changing the data model:

```sh
# Install EF tools locally if needed
dotnet tool install --global dotnet-ef

# Add migration (from repo root)
dotnet ef migrations add <Name> \
  --project backend/FanEngagement.Infrastructure/FanEngagement.Infrastructure.csproj \
  --startup-project backend/FanEngagement.Api/FanEngagement.Api.csproj

# Update database locally
dotnet ef database update \
  --project backend/FanEngagement.Infrastructure/FanEngagement.Infrastructure.csproj \
  --startup-project backend/FanEngagement.Api/FanEngagement.Api.csproj
```

The API applies pending migrations automatically on startup. Include generated migration files in your PR.

## Testing Strategy

- Use xUnit for unit/integration tests (`backend/FanEngagement.Tests`).
- Integration tests should exercise real HTTP routes via `WebApplicationFactory<Program>`.
- Keep tests fast and deterministic; seed only necessary data per test.
- Example: health check test (`HealthCheckTests.cs`) calls `GET /health` and asserts `200` with `{ status: "ok" }`.

Common commands:
 
```sh
dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj -c Release
```

## Coding Conventions

- Keep controllers thin; business logic belongs in Application/Infrastructure services.
- Prefer async APIs and pass `CancellationToken` through layers.
- Return appropriate HTTP status codes (`201 Created`, `404 NotFound`, `204 NoContent`, etc.).
- Validate inputs; prefer model binding attributes and FluentValidation (if introduced later).
- Naming: PascalCase for types, camelCase for locals/parameters, pluralize collections.

## Documentation & OpenAPI

- In Development, OpenAPI is available; add/maintain annotations as needed.
- Document new endpoints and request/response contracts in PR descriptions.

## Troubleshooting

- Build errors: run `dotnet restore` then `dotnet build` for the solution.
- EF tools not found: install with `dotnet tool install --global dotnet-ef`.
- Port conflicts: change or free `http://localhost:5049` or use HTTPS profile.

## CI

This repository uses a Docker Compose-based CI to ensure tests run against Postgres, matching local `docker compose` behavior.

- Workflow: `.github/workflows/ci.yml`
- Steps: start `db`, wait for health, run tests in the `tests` service, upload TRX results, teardown.
- Frontend: built as a static site in the `frontend` container; frontend unit tests run locally (`npm test` in `frontend/`).
- To reproduce locally:

```sh
docker compose up -d db
docker compose run --rm tests dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release
docker compose down -v
```

## Azure Notes (If Applicable)

- If tasks involve Azure (deployments, Bicep/Terraform, Functions, or Static Web Apps), follow Azure best practices and prefer verified modules/templates. Include deployment steps and validate with a dry run before changes.

---
This guide is designed for the GitHub Copilot coding agent to perform autonomous, safe changes with clear build/test guarantees and predictable PRs.
