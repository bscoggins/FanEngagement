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

FanEngagement is a **multi-tenant fan governance platform** that enables organizations to issue shares to users and conduct transparent, on-chain or off-chain voting on proposals. The platform combines traditional web application architecture with optional blockchain integration for enhanced transparency.

**Tech Stack:**
- **Backend:** .NET 9 Web API with layered architecture (API → Application → Domain → Infrastructure)
- **Database:** PostgreSQL 16 with Entity Framework Core
- **Frontend:** React 19 + TypeScript with Vite
- **Auth:** JWT-based authentication with role-based authorization
- **Blockchain:** Optional integration with Solana and Polygon (via adapter containers)

## Quick Start

```bash
# Start the full stack with Docker Compose
docker compose up --build

# Or use the development script (backend + frontend in watch mode)
./scripts/dev-up --full
```

**Access the application:**
- Frontend: http://localhost:3000 (Docker) or http://localhost:5173 (dev script)
- Backend API: http://localhost:8080 (Docker) or http://localhost:5049 (dev script)
- Swagger UI: http://localhost:8080/swagger or http://localhost:5049/swagger

**Default Admin Account:** See [Authentication & Test Accounts](#authentication--test-accounts) for credentials available in development.

## Documentation

📚 **[Complete Documentation Index](docs/README.md)** - Full documentation organized by topic

**Quick Links:**
- [Development Guide](docs/development.md) - Setup, testing, and workflows
- [Architecture Overview](docs/architecture.md) - System design and governance model
- [Design System](docs/frontend/design-system.md) - UI components and tokens
- [Audit Logging](docs/audit/architecture.md) - Security and compliance

## Prerequisites

- **Docker & Docker Compose** (recommended for all services)
- **.NET 9 SDK** (for backend development without Docker)
- **Node.js 20+** and npm (for frontend development)
- **PostgreSQL 16** (if running without Docker)

## Project Structure

```
FanEngagement/
├── backend/                     # .NET 9 Web API
│   ├── FanEngagement.Api        # HTTP endpoints, middleware, DI
│   ├── FanEngagement.Application # Use cases, DTOs, validation
│   ├── FanEngagement.Domain     # Entities, value objects, domain services
│   ├── FanEngagement.Infrastructure # EF Core, repositories, background services
│   └── FanEngagement.Tests      # Unit and integration tests
├── frontend/                    # React 19 + TypeScript SPA
│   ├── src/                     # Application source code
│   ├── e2e/                     # Playwright end-to-end tests
│   └── public/                  # Static assets
├── adapters/                    # Blockchain adapter containers
│   ├── solana/                  # Solana adapter (Node.js)
│   ├── polygon/                 # Polygon adapter (Node.js)
│   └── shared/                  # Shared adapter utilities
├── docs/                        # 📚 Complete documentation
│   ├── README.md                # Documentation index
│   ├── architecture.md          # System architecture
│   ├── development.md           # Development guide
│   ├── audit/                   # Audit logging documentation
│   ├── frontend/                # Frontend & design system docs
│   └── ...                      # See docs/README.md for full structure
├── scripts/                     # Development and deployment scripts
└── docker-compose.yml           # Multi-service orchestration
```

## Development Workflows

### Option 1: Docker Compose (Full Stack)

```bash
# Start all services (database + API + frontend)
docker compose up --build

# Or in detached mode
docker compose up -d --build

# View logs
docker compose logs -f api frontend

# Stop services (keeps data)
docker compose down

# Stop and remove all data
docker compose down -v
```

### Option 2: Development Scripts (Watch Mode)

```bash
# Start database + backend in watch mode
./scripts/dev-up

# Start database + backend + frontend (all in watch mode)
./scripts/dev-up --full

# Stop development environment
./scripts/dev-down

# Stop and clean all data
./scripts/dev-down --clean
```

### Option 3: Manual (No Docker)

**Prerequisites:** PostgreSQL running locally

```bash
# 1. Apply migrations (first time only)
cd backend
dotnet ef database update -p FanEngagement.Infrastructure -s FanEngagement.Api

# 2. Start backend
dotnet run --project FanEngagement.Api

# 3. Start frontend (in new terminal)
cd frontend
npm install
npm run dev
```

## API Documentation

### Swagger UI

Interactive API documentation is available via Swagger UI:

- **Local Development:** http://localhost:5049/swagger
- **Docker Compose:** http://localhost:8080/swagger

**To authenticate in Swagger UI:**
1. Call `POST /auth/login` with credentials (e.g., `admin@example.com` / `Admin123!`)
2. Copy the `token` from the response
3. Click "Authorize" button at the top
4. Enter the token value (without "Bearer" prefix)
5. Click "Authorize" to apply to all requests

### Key Endpoints

**Authentication:**
- `POST /auth/login` - Authenticate and get JWT token

**Organizations:**
- `GET /organizations` - List all organizations (public)
- `POST /organizations` - Create organization (Admin only)
- `GET /organizations/{id}` - Get organization details
- `PUT /organizations/{id}` - Update organization (OrgAdmin)

**Memberships:**
- `POST /organizations/{orgId}/memberships` - Add member (OrgAdmin)
- `GET /organizations/{orgId}/memberships` - List members
- `DELETE /organizations/{orgId}/memberships/{userId}` - Remove member (OrgAdmin)

**Share Types & Issuance:**
- `POST /organizations/{orgId}/share-types` - Create share type (OrgAdmin)
- `GET /organizations/{orgId}/share-types` - List share types
- `POST /organizations/{orgId}/share-issuances` - Issue shares (OrgAdmin)
- `GET /organizations/{orgId}/users/{userId}/balances` - View balances

**Proposals & Voting:**
- `POST /organizations/{orgId}/proposals` - Create proposal
- `GET /organizations/{orgId}/proposals` - List proposals
- `POST /proposals/{id}/open` - Open proposal for voting
- `POST /proposals/{id}/votes` - Cast vote
- `POST /proposals/{id}/close` - Close proposal
- `GET /proposals/{id}/results` - View results

**Admin:**
- `POST /admin/seed-dev-data` - Seed test data (Admin, Dev/Demo only)
- `POST /admin/reset-dev-data` - Reset to seed data (Admin, Dev/Demo only)
- `GET /users/admin/stats` - User statistics (Admin only)

See [Swagger UI](http://localhost:5049/swagger) for complete API reference.

## Authentication & Test Accounts

The API uses JWT bearer authentication. In non-production environments (Development, Demo, Staging), a default admin account is automatically created on startup.

**Default Admin:**
- Email: `admin@example.com`
- Password: `Admin123!`
- Role: Platform Administrator (full access)

### Seeding Test Data

For development and testing, seed the database with sample organizations, users, shares, and proposals:

**Option 1: Admin UI (Recommended)**
1. Log in as admin
2. Navigate to Admin → Dev Tools
3. Select a scenario and click "Seed"

**Option 2: API**
```bash
# Get admin token
TOKEN=$(curl -s -X POST http://localhost:5049/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}' | jq -r '.token')

# Seed basic demo data
curl -X POST http://localhost:5049/admin/seed-dev-data \
  -H "Authorization: Bearer $TOKEN"
```

**Seeded Test Accounts:**

| Type | Email | Password | Organizations |
|------|-------|----------|---------------|
| Platform Admin | `root_admin@platform.local` | `RootAdm1n!` | All (platform-wide) |
| Platform Admin | `platform_admin@fanengagement.dev` | `PlatAdm1n!` | All (platform-wide) |
| Org Admin | `alice@example.com` | `UserDemo1!` | Tech Innovators (Admin) |
| Member | `bob@abefroman.net` | `UserDemo1!` | Tech Innovators (Member) |
| Org Admin | `carlos@demo.co` | `UserDemo2!` | Green Energy United (Admin) |
| Member | `dana@sample.io` | `UserDemo2!` | Green Energy United, City FC |
| Org Admin | `erika@cityfc.support` | `UserDemo3!` | Green Energy United, City FC (Admin) |
| Member | `frank@cityfc.support` | `UserDemo3!` | City FC Supporters Trust |

See [docs/demo-seed-data.md](docs/demo-seed-data.md) for complete details on seeded data, including share allocations and proposal scenarios.

## Testing

### Backend Tests

```bash
# Run all backend tests
./scripts/test-backend

# Run with verbose output
./scripts/test-backend --verbose

# Run specific tests
./scripts/test-backend --filter "ProposalLifecycleTests"

# Or use dotnet directly
cd backend
dotnet test
```

### Frontend Tests

```bash
# Run all frontend tests
./scripts/test-frontend

# Run in watch mode
./scripts/test-frontend --watch

# Run with coverage
./scripts/test-frontend --coverage

# Or use npm directly
cd frontend
npm test
```

### End-to-End Tests (Playwright)

```bash
# Run E2E tests with automatic setup and teardown
./scripts/run-e2e.sh

# This script:
# - Starts the full stack (database, API, frontend)
# - Waits for services to be healthy
# - Resets database to seed data
# - Runs Playwright tests headless
# - Cleans up E2E test data on success
# - Stops services

# Or run manually (with backend already running)
cd frontend
VITE_API_BASE_URL=http://localhost:8080 npm run e2e
```

**Test Coverage:** 280+ tests covering domain logic, authorization, multi-tenancy, proposal lifecycle, and E2E workflows.

See [docs/development.md](docs/development.md#running-tests) for detailed testing instructions.
 
## Blockchain Integration (Optional)

FanEngagement supports optional blockchain integration for governance transparency. Organizations can select their preferred blockchain (Solana, Polygon, or None) to record governance events on-chain.

### Supported Blockchains

- **Solana** - High throughput, low-cost transactions, SPL token standard
- **Polygon** - Ethereum-compatible L2, ERC-20 tokens, lower gas fees
- **None** - Off-chain only (default)

### Starting Blockchain Adapters

Adapters run as separate Docker containers. The Solana adapter is enabled by default and connects to Devnet.

**Solana Adapter (Devnet):**
```bash
# Solana adapter starts automatically with docker compose up
# It is configured to use Solana Devnet by default
```

**Polygon Adapter:**
```bash
# Requires POLYGON_PRIVATE_KEY environment variable
export POLYGON_PRIVATE_KEY="your-private-key"
docker compose up -d polygon-adapter
```

See [docs/blockchain/](docs/blockchain/) for complete blockchain integration documentation.

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string | See appsettings.json |
| `Jwt__SigningKey` | JWT signing key (required) | See appsettings.Development.json |
| `Jwt__Issuer` | JWT issuer | FanEngagement |
| `Jwt__Audience` | JWT audience | FanEngagement |
| `ASPNETCORE_ENVIRONMENT` | Environment name | Development |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | API base URL | `/api` (proxied to :5049) |

### Blockchain Adapters

| Variable | Description | Required |
|----------|-------------|----------|
| `SOLANA_PRIVATE_KEY` | Solana private key (JSON array) | For Solana adapter |
| `SOLANA_RPC_URL` | Solana RPC URL | Defaults to devnet |
| `POLYGON_PRIVATE_KEY` | Polygon private key (hex) | **Required** for Polygon adapter |
| `POLYGON_RPC_URL` | Polygon RPC URL | Defaults to Amoy testnet |

## Docker Compose Profiles

Control which services start with compose profiles:

| Profile | Services | Use Case |
|---------|----------|----------|
| (default) | db, api, frontend, polygon-adapter | Full stack with Polygon |
| `solana` | solana-adapter | Solana blockchain integration |
| `tests` | backend test runner | Run backend tests in container |
| `e2e` | E2E test runner | Run Playwright tests |
| `tools` | Playwright MCP helper | Development tools |

**Examples:**
```bash
# Start default stack (no Solana, no tests)
docker compose up -d

# Start with Solana adapter
docker compose --profile solana up -d solana-adapter

# Run backend tests
docker compose --profile tests run --rm tests

# Run E2E tests
docker compose --profile e2e run --rm e2e
```

## Development Scripts Reference

| Script | Description |
|--------|-------------|
| `./scripts/dev-up` | Start Postgres + backend in watch mode |
| `./scripts/dev-up --full` | Start Postgres + backend + frontend in watch mode |
| `./scripts/dev-down` | Stop development environment |
| `./scripts/dev-down --clean` | Stop and remove all data (volumes) |
| `./scripts/test-backend` | Run backend tests |
| `./scripts/test-frontend` | Run frontend tests |
| `./scripts/run-tests.sh` | Run both backend and frontend tests |
| `./scripts/run-e2e.sh` | Run end-to-end tests with full stack |

## Additional Resources

- 📚 **[Complete Documentation](docs/README.md)** - Full documentation index
- 🏗️ **[Architecture Guide](docs/architecture.md)** - System design and governance model
- 🔧 **[Development Guide](docs/development.md)** - Detailed development workflows
- 🎨 **[Design System](docs/frontend/design-system.md)** - UI components and design tokens
- 🔒 **[Audit Logging](docs/audit/architecture.md)** - Security and compliance
- 🔗 **[Blockchain Integration](docs/blockchain/)** - Multi-chain adapter platform

## License

**Copyright © 2025 Brent Scoggins. All Rights Reserved.**

This software is proprietary and confidential. See [LICENSE](LICENSE) file for complete terms.
