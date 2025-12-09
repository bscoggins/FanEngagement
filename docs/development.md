# Developer Quick Start

This guide helps you get up and running with the FanEngagement development environment quickly.

## Prerequisites

- **Docker** and **Docker Compose** (recommended)
- **Node.js 20+** (for frontend development)
- **.NET 9 SDK** (for backend development without Docker)
- **PostgreSQL 16** (if running without Docker)

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

#### Solana Adapter + Validator (On Demand)

The Solana adapter and the local `solana-test-validator` live behind the `solana` compose profile so they stay off by default. The adapter now targets Solana **devnet** unless you override its `SOLANA_RPC_URL`.

```bash
# Routine development: adapter only, pointed at devnet
docker compose --profile solana up -d solana-adapter

# Deterministic local testing: start adapter + validator and override RPC
# Recommended: use an env file
echo "SOLANA_RPC_URL=http://solana-test-validator:8899" > .env.local
echo "SOLANA_NETWORK=localnet" >> .env.local
docker compose --env-file .env.local --profile solana up -d solana-test-validator solana-adapter

# Or export variables in your shell before running
export SOLANA_RPC_URL=http://solana-test-validator:8899
export SOLANA_NETWORK=localnet
docker compose --profile solana up -d solana-test-validator solana-adapter
# Tear everything down when finished
docker compose --profile solana down
```

Any scripts or test runs that rely on Solana should add `--profile solana` so the adapter container is present. If a workflow truly needs the embedded validator, include it explicitly (as shown above) or run the validator manually before launching the adapter.

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
# DO NOT commit .env.development or any file containing private keys to version control!
echo "SOLANA_PRIVATE_KEY=$(cat solana-devnet-keypair.json)" >> .env.development

# 5) Verify .env.development is in .gitignore (it should already be)
git check-ignore .env.development

# If the above command returns nothing, add `.env.development` to your .gitignore immediately.
```
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
| `./scripts/run-e2e.sh` | Run end-to-end tests |

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
