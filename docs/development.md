# Developer Quick Start

## Documentation Index

This guide covers local development setup, testing workflows, and troubleshooting. For other topics:

- **[Architecture Overview](architecture.md)** - System design and governance model
- **[Complete Documentation Index](README.md)** - Full documentation index
- **[Frontend Documentation](frontend/README.md)** - React frontend and design system
- **[Testing Login Flow](guides/testing-login-flow.md)** - Authentication testing guide
- **[PostgreSQL Persistence](technical/postgres-persistence.md)** - Database persistence with Docker

This guide helps you get up and running with the FanEngagement development environment quickly.

If you are on macOS and brand new to the project, run the bootstrap script first: `./scripts/setup-mac-dev.sh` (see [guides/new-developer-setup.md](guides/new-developer-setup.md)).

## Prerequisites

- **Docker** and **Docker Compose** (recommended)
- **Node.js 20+** (for frontend development)
- **.NET 9 SDK** (for backend development without Docker)
- **PostgreSQL 16** (if running without Docker)

## Node Dependency Management

- Every Node-based project in this repo (frontend plus both adapters) keeps its `package-lock.json` committed so `npm ci` installs the exact dependency graph that CI and production use.
- When adding or updating dependencies, run `npm install` (which refreshes the lockfile), commit the resulting `package-lock.json`, and verify `npm ci && npm test` succeed inside the package you touched.
- CI workflows rely on `npm ci`, so missing or untracked lockfiles will fail builds—make sure new Node packages follow the same convention.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/FanEngagement.git
cd FanEngagement
```

### 2. Start the Development Environment

The easiest way to start developing is using Docker Compose with the provided scripts.

#### Option A: Using Development Scripts (Recommended)

```bash
# Start database and backend in watch mode
./scripts/dev-up

# Or start the full stack (database + backend + frontend)
./scripts/dev-up --full
```

- **Backend API**: http://localhost:5049
- **Frontend** (if started): http://localhost:5173

#### Option B: Using Docker Compose Directly

```bash
# Start the full stack
docker compose up --build

# Or start in detached mode
docker compose up -d --build
```

- **Backend API**: http://localhost:8080
- **Frontend**: http://localhost:3000

#### Solana Adapter

The Solana adapter is now included in the default `docker-compose.yml` configuration and will start automatically. It is configured to target **Solana Devnet** by default.

```bash
# The adapter starts with the rest of the stack
docker compose up -d

# View adapter logs
docker compose logs -f solana-adapter
```

The adapter uses a pre-configured public key for development. If you need to fund the wallet for testing:

1. Get the wallet address from the logs or the Admin UI.
2. Use the Solana Faucet or CLI to airdrop SOL to that address on Devnet.

##### Generating and Funding a Devnet Keypair

Use the Solana CLI to create a disposable keypair and request devnet SOL for transaction fees:

```bash
# 1) Create a keypair file (JSON array of numbers)
solana-keygen new --outfile solana-devnet-keypair.json

# 2) Request 2 devnet SOL for that key (repeat if rate-limited)
solana airdrop 2 "$(solana-keygen pubkey solana-devnet-keypair.json)" \
  --url https://api.devnet.solana.com

# 3) Verify the balance
solana balance "$(solana-keygen pubkey solana-devnet-keypair.json)" \
  --url https://api.devnet.solana.com

# 4) Store the private key securely for development
echo "SOLANA_PRIVATE_KEY='$(cat solana-devnet-keypair.json)'" >> .env.development

# 5) Verify .env.development is in .gitignore (it should already be)
git check-ignore .env.development

# If the above command returns nothing, add `.env.development` to your .gitignore immediately.
```

> **Note:**  
> `.env.development` is intentionally listed in `.gitignore` and is safe to use for local development.  
> However, it contains sensitive information (your Solana private key) and should **never** be committed to version control or shared outside your local environment.

### 3. Apply Migrations

Migrations are automatically applied when the API starts. No manual steps needed.

### 4. Seed Development Data

Use the Admin Dev Tools UI or the API to seed test data:

**Via UI (Recommended):**

1. Log in as admin (`admin@example.com` / `Admin123!`)
2. Navigate to Admin → Dev Tools (`/admin/dev-tools`)
3. Select a scenario and click "Seed"

**Via API:**

```bash
# Seed basic demo data
curl -X POST http://localhost:5049/admin/seed-dev-data \
  -H "Authorization: Bearer <admin-token>"

# Seed with specific scenario
curl -X POST "http://localhost:5049/admin/seed-dev-data?scenario=HeavyProposals" \
  -H "Authorization: Bearer <admin-token>"
```

**Available Scenarios:**

- `BasicDemo` - Small but comprehensive dataset (default)
- `HeavyProposals` - 50+ proposals for pagination testing
- `WebhookFailures` - Webhook events with various statuses

**Seeded Accounts (quick reference):**

| Type | Email | Password | Notes |
|------|-------|----------|-------|
| Platform Admin | `root_admin@platform.local` | `RootAdm1n!` | Platform superuser |
| Platform Admin | `platform_admin@fanengagement.dev` | `PlatAdm1n!` | Secondary admin |
| Default Admin | `admin@example.com` | `Admin123!` | Ensured automatically at startup |
| Org Admin | `alice@example.com` | `UserDemo1!` | Tech Innovators OrgAdmin |
| Member | `bob@abefroman.net` | `UserDemo1!` | Tech Innovators member |
| Org Admin | `carlos@demo.co` | `UserDemo2!` | Green Energy United OrgAdmin |
| Member | `dana@sample.io` | `UserDemo2!` | Member of Green Energy United + City FC |
| Org Admin | `erika@cityfc.support` | `UserDemo3!` | OrgAdmin for Green Energy United & City FC |
| Member | `frank@cityfc.support` | `UserDemo3!` | City FC Supporters Trust member |

See [docs/demo-seed-data.md](./demo-seed-data.md) for organization memberships, share allocations, and proposal details.

## Running Tests

### Backend Tests

```bash
# Run all backend tests
./scripts/test-backend

# Run with verbose output
./scripts/test-backend --verbose

# Run specific tests
./scripts/test-backend --filter "HealthCheckTests"
```

### Solana Governance Program Tests

```bash
# Build, unit test, and deploy-check the fan-governance program on a local validator
./scripts/run-solana-governance-tests.sh
```

### Frontend Tests

```bash
# Run all frontend tests
./scripts/test-frontend

# Run in watch mode
./scripts/test-frontend --watch

# Run with coverage
./scripts/test-frontend --coverage
```

### End-to-End Tests

```bash
# Using the E2E script (starts backend automatically)
./scripts/run-e2e.sh

# Or manually (with backend already running)
cd frontend
VITE_API_BASE_URL=http://localhost:8080 npm run e2e
```

> **Note:** Playwright specs must interact with the product exactly as a user would. Avoid calling backend APIs or mutating storage directly from a test—drive the UI using page actions instead. The `./scripts/run-e2e.sh` helper logs in as the seeded admin, resets dev data, and cleans up after the run, so new tests should assume a fresh seed rather than attempting to seed data themselves.

## Common Workflows

### Spin Up Everything and Start Coding

```bash
# 1. Start the development environment
./scripts/dev-up --full

# 2. Seed development data (in another terminal)
# Log into the admin UI or use curl

# 3. Start coding!
# Backend changes are auto-reloaded with dotnet watch
# Frontend changes are auto-reloaded with Vite
```

### Reset Dev Data

If you need to reset to a clean state:

```bash
# Via API
curl -X POST http://localhost:5049/admin/reset-dev-data \
  -H "Authorization: Bearer <admin-token>"
```

Or use the "Reset to Seed Data" button in the Admin Dev Tools UI.

### Run Just Backend Tests

```bash
./scripts/test-backend
```

### Run E2E Tests

```bash
./scripts/run-e2e.sh
```

### Stop Development Environment

```bash
# Stop services but keep data
./scripts/dev-down

# Stop services and remove all data
./scripts/dev-down --clean
```

## Development Scripts Reference

| Script | Description |
|--------|-------------|
| `./scripts/dev-up` | Start Postgres + backend in watch mode |
| `./scripts/dev-up --full` | Start Postgres + backend + frontend |
| `./scripts/dev-down` | Stop development environment |
| `./scripts/dev-down --clean` | Stop and remove all data (volumes) |
| `./scripts/test-backend` | Run backend tests |
| `./scripts/test-frontend` | Run frontend tests |
| `./scripts/run-solana-governance-tests.sh` | Build + test Solana governance program and validator install check |
| `./scripts/run-e2e.sh` | Run end-to-end tests |
| `./scripts/run-all-tests.sh` | Run governance, backend, frontend, and E2E suites in order |

## Dev Data Scenarios

### BasicDemo (Default)

- 2 organizations (Tech Innovators, Creative Studios)
- 3 users (alice, bob, charlie)
- Sample share types, proposals, and votes
- Good for general development and testing

### HeavyProposals

- Includes BasicDemo data
- Additional organization with 50 proposals
- Various proposal statuses (Draft, Open, Closed, Finalized)
- Good for pagination and performance testing

### WebhookFailures

- Includes BasicDemo data
- 3 webhook endpoints configured
- Outbound events with various statuses (Pending, Delivered, Failed)
- Good for testing observability and retry mechanisms

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string | See appsettings.json |
| `Jwt__Issuer` | JWT issuer | FanEngagement |
| `Jwt__Audience` | JWT audience | FanEngagement |
| `Jwt__SigningKey` | JWT signing key (required) | See appsettings.Development.json |
| `ASPNETCORE_ENVIRONMENT` | Environment name | Development |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | API base URL | `/api` (proxied) or `http://localhost:5049` |

## Troubleshooting

### Port Conflicts

If ports are already in use:

- Backend (5049): Change in `launchSettings.json`
- Frontend (5173): Vite will auto-increment
- Docker API (8080): Change in `docker-compose.yml`
- Docker Frontend (3000): Change in `docker-compose.yml`

### Database Connection Issues

1. Ensure PostgreSQL is running: `docker compose up -d db`
2. Check connection string in `appsettings.Development.json`
3. Verify database exists: `docker exec -it fanengagement-db psql -U fanengagement`

### Build Errors

```bash
# Backend: restore dependencies
dotnet restore backend/FanEngagement.sln

# Frontend: reinstall dependencies
cd frontend
rm -rf node_modules
npm ci
```

### Test Failures

```bash
# Ensure database is running for backend tests
docker compose up -d db

# For frontend tests, no database needed (uses mocks)
```

## Additional Resources

- [Architecture Documentation](architecture.md)
- [API Documentation](http://localhost:5049/swagger) (in Development)
- [Copilot Instructions](../.github/copilot-instructions.md)
