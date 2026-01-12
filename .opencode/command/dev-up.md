---
description: Start the development environment
---

Start the development environment for local development.

## What This Does

1. Starts PostgreSQL via Docker Compose
2. Runs `dotnet watch` for the backend API (hot-reload)
3. Optionally starts the Vite dev server for frontend

## Start Command

```
!`./scripts/dev-up`
```

## Options

| Flag | Description |
|------|-------------|
| `--full` | Also start the Vite dev server for frontend hot-reload |

To start both backend and frontend:
```bash
./scripts/dev-up --full
```

## Ports

| Service | Port | URL |
|---------|------|-----|
| API | 5049 | http://localhost:5049 |
| Frontend (Vite) | 5173 | http://localhost:5173 |
| PostgreSQL | 5432 | localhost:5432 |

## Stopping

To stop the development environment:
```bash
./scripts/dev-down
```

To stop and wipe the database:
```bash
./scripts/dev-down --clean
```

## Alternative: Docker Compose

For a production-style stack:
```bash
docker compose up --build
```

This runs on different ports:
- API: http://localhost:8080
- Frontend: http://localhost:3000

## Troubleshooting

- **Port in use**: Check for existing processes on ports 5049, 5173, or 5432
- **Database connection failed**: Ensure Docker is running
- **Migration errors**: Run `dotnet ef database update` manually
