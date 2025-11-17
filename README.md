# FanEngagement – Runtime: .NET 9

## Overview

FanEngagement is a multi-tenant fan governance platform. Organizations issue share types to users for voting on proposals. The backend is a layered ASP.NET Core Web API using EF Core with PostgreSQL.

## Projects (under `/backend`)

- FanEngagement.Api – HTTP endpoints, DI wiring
- FanEngagement.Application – use cases, DTOs, validation
- FanEngagement.Domain – entities, value objects
- FanEngagement.Infrastructure – EF Core DbContext, migrations, repositories
- FanEngagement.Tests – unit + integration tests

## Prerequisites

- .NET 9 SDK
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

Key endpoints (current):

- `GET /health`
- `POST /organizations`
- `GET /organizations`
- `GET /organizations/{id}`
- `POST /organizations/{orgId}/share-types`
- `GET /organizations/{orgId}/share-types`

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
