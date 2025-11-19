# FanEngagement – Runtime: .NET 9

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

The API uses JWT bearer authentication. In development mode, an initial admin user is automatically created on startup:

**Development Admin Credentials:**
- Email: `admin@example.com`
- Password: `Admin123!`

The admin user has access to admin-only endpoints (marked with `[Authorize(Roles = "Admin")]`). Regular users are created with the `User` role by default.

To authenticate:
1. Send a POST request to `/auth/login` with email and password
2. Use the returned JWT token in the `Authorization: Bearer <token>` header for subsequent requests
3. The JWT includes a role claim that is used for role-based authorization

## Run the Frontend

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the development server:

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

## Tests

Run all tests from `/backend`:

```bash
dotnet test
```

Or run tests in a container (requires Docker):

```bash
docker compose run --rm tests
```
