# FanEngagement – Runtime: .NET 9

## ⚠️ License Notice

**Copyright © 2025 Brent Scoggins. All Rights Reserved.**

This software is proprietary and confidential. Unauthorized use, copying, modification, 
distribution, or public performance is strictly prohibited without explicit written 
permission from the copyright holder.

For permission requests, contact: bscoggins@users.noreply.github.com

This is an interim licensing stance. See the [LICENSE](LICENSE) file for complete terms.

---

## Overview

FanEngagement is a multi-tenant fan governance platform. Organizations issue share types to users for voting on proposals. The backend is a layered ASP.NET Core Web API using EF Core with PostgreSQL. The frontend is a React + TypeScript single-page application built with Vite.

## Projects

### Backend (under `/backend`)

- FanEngagement.Api – HTTP endpoints, DI wiring
- FanEngagement.Application – use cases, DTOs, validation
- FanEngagement.Domain – entities, value objects
- FanEngagement.Infrastructure – EF Core DbContext, migrations, repositories
- FanEngagement.Tests – unit + integration tests

### Frontend (under `/frontend`)

- React + TypeScript SPA using Vite
- React Router for routing
- Axios for API calls
- Vitest + Testing Library for testing

## Prerequisites

- .NET 9 SDK
- Node.js 18+ and npm
- Docker (for PostgreSQL)

## Start PostgreSQL with Docker Compose

From the repo root:

```bash
docker compose up -d db
```
Default credentials (from `docker-compose.yml`): `fanengagement`/`fanengagement`, database `fanengagement`. Port `5432`.

## Database migrations

1) Ensure Postgres is running (`docker compose up -d db`).
2) From `/backend`, apply the initial migration:

```bash
dotnet ef database update -p FanEngagement.Infrastructure -s FanEngagement.Api
```

## Run the API

From `/backend`:

```bash
dotnet run --project FanEngagement.Api
```

The API runs on `http://localhost:5049` by default.

### API Documentation (Swagger UI)

Swagger UI provides interactive API documentation with the ability to test endpoints directly in the browser.

**Local Development:**
- Start the API: `dotnet run --project FanEngagement.Api`
- Open Swagger UI: `http://localhost:5049/swagger`

**Docker Compose:**
- Start the stack: `docker compose up --build`
- Open Swagger UI: `http://localhost:8080/swagger`

The Swagger UI includes:
- All API endpoints with request/response schemas
- JWT Bearer authentication support (click "Authorize" button to enter your token)
- Ability to try out endpoints directly from the UI

To authenticate in Swagger UI:
1. First call `POST /auth/login` with valid credentials (e.g., `admin@example.com` / `Admin123!`)
2. Copy the `token` from the response
3. Click the "Authorize" button at the top of the page
4. Enter just the token value (without "Bearer" prefix)
5. Click "Authorize" to apply the token to all subsequent requests

Key endpoints (current):

- `GET /health`
- `POST /auth/login` – Authenticate and get JWT token
- `GET /users` – List all users (requires authentication)
- `GET /users/{id}` – Get user by ID (requires authentication)
- `GET /users/admin/stats` – Admin-only endpoint (requires Admin role)
- `POST /users` – Create new user
- `POST /organizations`
- `GET /organizations`
- `GET /organizations/{id}`
- `POST /organizations/{orgId}/share-types`
- `GET /organizations/{orgId}/share-types`

### Authentication & Authorization

The API uses JWT bearer authentication. In non-production modes (Development, Demo, Staging), an initial admin user is automatically ensured on startup:

**Admin Credentials (non-production):**
- Email: `admin@example.com`
- Password: `Admin123!`

The admin user has access to admin-only endpoints (marked with `[Authorize(Roles = "Admin")]`). Regular users are created with the `User` role by default.

To authenticate:
1. Send a POST request to `/auth/login` with email and password
2. Use the returned JWT token in the `Authorization: Bearer <token>` header for subsequent requests
3. The JWT includes a role claim that is used for role-based authorization

### Demo / Dev Seed Data

For development and testing, you can seed the database with sample data using the admin endpoint:

```bash
# Login as admin first
TOKEN=$(curl -s -X POST http://localhost:5049/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}' | jq -r '.token')

# Seed demo data
curl -X POST http://localhost:5049/admin/seed-dev-data \
  -H "Authorization: Bearer $TOKEN"
```

This creates:
- 2 platform admin accounts
- 6 regular user accounts with various organization memberships
- 3 organizations with share types, proposals, and votes

Quick reference for the seeded credentials:

| Type | Email | Password | Notes |
|------|-------|----------|-------|
| Platform Admin | `root_admin@platform.local` | `RootAdm1n!` | Platform superuser |
| Platform Admin | `platform_admin@fanengagement.dev` | `PlatAdm1n!` | Secondary admin |
| Default Admin | `admin@example.com` | `Admin123!` | Ensured automatically in non-production |
| Org Admin | `alice@example.com` | `UserDemo1!` | Tech Innovators org admin |
| Org Admin | `carlos@demo.co` | `UserDemo2!` | Green Energy United org admin |
| Org Admin | `erika@cityfc.support` | `UserDemo3!` | Green Energy United + City FC org admin |
| Member | `bob@abefroman.net` | `UserDemo1!` | Tech Innovators member |
| Member | `dana@sample.io` | `UserDemo2!` | Member of Green Energy United + City FC |
| Member | `frank@cityfc.support` | `UserDemo3!` | City FC Supporters Trust member |

See [docs/demo-seed-data.md](docs/demo-seed-data.md) for complete details on all seeded accounts and test data.

## Run the Frontend

1. Install dependencies:

```bash
cd frontend
npm install
```

1. Start the development server:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` by default and is configured to call the API at `http://localhost:5049`.

### Frontend Configuration

The frontend API base URL is configured via environment variables:

- Development: `.env.development` contains `VITE_API_BASE_URL=http://localhost:5049`
- The API client automatically attaches JWT tokens from localStorage as `Authorization: Bearer <token>` headers

### Frontend Scripts

From `/frontend`:

- `npm run dev` – Start development server with hot reload
- `npm run build` – Build for production
- `npm run preview` – Preview production build locally
- `npm test` – Run tests
- `npm run test:watch` – Run tests in watch mode
- `npm run lint` – Run ESLint

### Frontend Routes

- `/` – Home page
- `/login` – Login page (implementation pending)
- `/users` – Users list page (placeholder)
- `/users/:id/edit` – User edit page (placeholder)

## Run everything with Docker Compose

Build the API image and start API + Postgres from the repo root:

```bash
docker compose up --build
```

API is available at `http://localhost:8080` and uses the `db` service connection string automatically.
The API applies EF Core migrations on startup.
Swagger UI is available at `http://localhost:8080/swagger` for API documentation and testing.

### Compose Profiles

- `solana` – Brings up the Solana adapter (now pointed at Solana devnet by default) and, only if you ask for it, the local `solana-test-validator`. For routine work run `docker compose --profile solana up -d solana-adapter` to talk to devnet. When you need the deterministic validator, include it in the command: `docker compose --profile solana up -d solana-test-validator solana-adapter` and override `SOLANA_RPC_URL` to `http://solana-test-validator:8899`.
- **Note:** The `polygon-adapter` service is **not** behind a profile and will start by default with `docker compose up`. This is intentional due to the way blockchain testing is implemented upstream—Polygon can run without requiring a dedicated profile for testing purposes.
- The backend unit/integration test runner is behind the `tests` profile. Run it on-demand with `docker compose --profile tests run --rm tests` (or `docker compose --profile tests up tests`).
- The E2E test runner service is behind the `e2e` profile and will not start on a normal `docker compose up`.
- A long-lived Playwright MCP helper is behind the `tools` profile and is also excluded by default.

## Tests

Run all tests from `/backend`:

```bash
dotnet test
```

Or run tests in a container (requires Docker):

```bash
docker compose --profile tests run --rm tests
```

### End-to-End (Playwright)

- On-demand E2E run (starts stack, runs headless tests in container, cleans up test data on success, then stops services):

```bash
./scripts/run-e2e.sh
```

- Internals: the script enables the `e2e` compose profile (`docker compose --profile e2e run --rm e2e`) and sets `CI=1` so Playwright runs headless in the Linux container.
 