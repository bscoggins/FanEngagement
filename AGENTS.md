# OpenCode Instructions — FanEngagement

This file provides instructions for OpenCode when working in this repository. It contains project context, development guidelines, and behavioral rules.

---

## Project Overview

FanEngagement is a **multi-tenant fan governance platform** enabling organizations to issue shares, create proposals, and facilitate voting among members.

### Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | .NET 9 Web API (Clean Architecture) |
| Database | PostgreSQL 16 + Entity Framework Core |
| Frontend | React 19 + TypeScript + Vite 7 |
| Testing | xUnit, Vitest, Playwright |
| Blockchain | Solana adapter, Polygon adapter (Node.js/TypeScript) |
| Infrastructure | Docker Compose, Kubernetes |

### Architecture Summary

The backend follows **Clean Architecture** with strict dependency direction:

```
Api → Application → Domain ← Infrastructure
```

- **Api**: Controllers, middleware, authorization handlers
- **Application**: DTOs, interfaces, validators, use cases
- **Domain**: Entities, enums, domain services (pure business logic)
- **Infrastructure**: EF Core, repositories, external service integrations

---

## Repository Structure

```
FanEngagement/
├── backend/                    # .NET 9 solution
│   ├── FanEngagement.Api/      # ASP.NET Core Web API
│   ├── FanEngagement.Application/
│   ├── FanEngagement.Domain/
│   ├── FanEngagement.Infrastructure/
│   └── FanEngagement.Tests/    # xUnit tests
├── frontend/                   # React 19 + Vite SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route-based pages
│   │   ├── navigation/         # navConfig.ts (single source of truth)
│   │   ├── hooks/              # Custom React hooks
│   │   └── api/                # API client modules
│   └── e2e/                    # Playwright tests
├── adapters/                   # Blockchain microservices
│   ├── solana/                 # Solana adapter (Node.js)
│   ├── polygon/                # Polygon adapter (Node.js)
│   └── shared/                 # Shared utilities
├── docs/                       # Comprehensive documentation
├── scripts/                    # Development scripts
├── deploy/                     # Kubernetes manifests
└── .opencode/                  # OpenCode agents and commands
```

---

## Global Rules

### Safety and Scope

- Prefer **small, targeted, reversible** changes
- Avoid broad refactors unless explicitly requested
- Maintain **backward compatibility** unless explicitly permitted
- Never introduce new frameworks, libraries, or architectural patterns without instruction

### Architectural Consistency

- Follow the **layering structure** of the backend (Api → Application → Domain → Infrastructure)
- Follow established **React + TypeScript** conventions in the frontend
- Respect **dependency boundaries** between layers
- Use domain services (e.g., `ProposalGovernanceService`) for proposal logic

### Testing Requirements

- Ensure backend tests pass: `dotnet test backend/FanEngagement.Tests`
- Ensure frontend tests pass: `npm test` in `frontend/`
- Never modify production code solely to satisfy a flawed test
- Create tests for all new logic, states, and edge cases
- **You are not done until there are 0 test failures**

### Documentation Requirements

- Update documentation in the same PR when behavior changes
- Keep architecture docs aligned with code
- Ensure code comments (C# XML doc, TS JSDoc) reflect current behavior

### Security

- Never commit secrets or tokens
- Use placeholders and instruct humans where secrets must be passed
- Follow authorization patterns defined in `docs/authorization.md`

---

## Backend Development Guide

### API Pattern

When implementing backend features, follow this sequence:

1. Define controller action in `FanEngagement.Api`
2. Add/modify Application interfaces and DTOs
3. Update Domain logic if needed
4. Update Infrastructure services
5. Add validators (FluentValidation)
6. Add or update tests
7. Document changes

### Authorization Model

FanEngagement uses a **two-tier role model**:

| Level | Roles |
|-------|-------|
| Global | User, Admin |
| Organization | Member, OrgAdmin |

**Policies:**
- `GlobalAdmin` — Platform administrators
- `OrgMember` — Organization membership required
- `OrgAdmin` — Organization admin required
- `ProposalManager` — Proposal management rights

**Rules:**
- Admins bypass org-level checks
- OrgAdmin required for writes
- OrgMember required for viewing org data
- Proposal transitions must use `ProposalGovernanceService`

Apply correct authorization attributes on new endpoints.

### EF Core Migrations

- Create migrations for model changes: `dotnet ef migrations add <Name> --project backend/FanEngagement.Infrastructure --startup-project backend/FanEngagement.Api`
- Include migration files in PR
- Never modify existing migration files

### Error Handling

- Follow centralized exception handling via `GlobalExceptionHandler`
- Never add controller try/catch blocks
- Use structured logging for backend logic
- Return `ProblemDetails` for errors

---

## Frontend Development Guide

### Standard Page Requirements

Every page should implement:
- `LoadingSpinner` during data fetching
- `ErrorMessage` with retry capability
- `EmptyState` where appropriate
- User notifications for actions
- Async button state handling

### Navigation Configuration

**Single Source of Truth**: All navigation items are defined in `frontend/src/navigation/navConfig.ts`

- Never hardcode sidebar links
- Use `useNavigation()` hook to access resolved items
- Control access via `roles` (PlatformAdmin, OrgAdmin, Member) and `scope` (global, org, user)
- Add visibility tests in `navConfig.test.ts` for every new item

### Permission Model

- Use route guards: `AdminRoute`, `OrgAdminRoute`, `ProtectedRoute`
- Use `usePermissions()` for conditional UI
- Use `IfGlobalAdmin`, `IfOrgAdmin`, `IfOrgMember` components
- Unauthorized UI paths must not be exposed

### Organization Navigation Model

The admin area uses a centralized organization navigation model:

1. **Organization Switcher**: Located in `AdminLayout` sidebar
2. **Role-based Navigation**: Items appear/disappear based on user's role in selected org
3. **Mixed-role Users**: Users can be OrgAdmin in one org and Member in another

### API Integration

- Use existing `apiClient` wrappers in `frontend/src/api/`
- Ensure new API endpoints exist and match backend
- Use `data-testid` attributes for testable DOM elements

---

## Blockchain Adapters Guide

Both adapters live under `/adapters` and expose:
- `/v1/adapter/*` REST endpoints
- `/health` and `/metrics` for observability

### Solana Adapter (`adapters/solana`)
- Port: 3001
- Requires: `SOLANA_PRIVATE_KEY`, `API_KEY`
- Uses `@solana/web3.js`

### Polygon Adapter (`adapters/polygon`)
- Port: 3002
- Requires: `POLYGON_PRIVATE_KEY`, `POLYGON_RPC_URL`, `API_KEY`
- Uses `ethers.js`

### Testing Adapters
- Solana: `./scripts/test-solana-adapter`
- Polygon: `./scripts/test-polygon-adapter`
- Each adapter has Jest-based test suites

---

## Development Scripts

| Script | Purpose |
|--------|---------|
| `./scripts/dev-up` | Start PostgreSQL + dotnet watch (pass `--full` for Vite too) |
| `./scripts/dev-down` | Stop dev environment |
| `./scripts/test-backend` | Run backend xUnit tests |
| `./scripts/test-frontend` | Run frontend Vitest tests |
| `./scripts/run-tests.sh` | Run all unit tests |
| `./scripts/run-e2e.sh` | Run Playwright E2E tests |

### Docker Compose

```sh
docker compose up --build          # Full stack (ports 8080, 3000)
docker compose up -d db            # Just PostgreSQL
docker compose down --remove-orphans  # Stop services
docker compose down -v             # Stop + wipe volumes
```

---

## External File Loading

When you encounter a file reference below, use your Read tool to load it on a **need-to-know basis**. These files contain detailed specifications relevant to specific tasks.

### Architecture & Authorization
- `@docs/architecture.md` — Complete domain model, lifecycle rules, governance
- `@docs/authorization.md` — Policy-based authorization system

### Frontend
- `@docs/frontend/design-system.md` — Design tokens, colors, typography
- `@docs/frontend/navigation.md` — Navigation implementation patterns
- `@docs/frontend/accessibility.md` — WCAG compliance checklist

### Blockchain
- `@docs/blockchain/README.md` — Adapter documentation index
- `@docs/blockchain/adapter-testing.md` — Testing strategy

### Audit
- `@docs/audit/architecture.md` — Audit logging system

### Testing
- `@docs/development.md` — Development setup and workflows

---

## Coding Conventions

### Backend (C#)
- Controllers stay thin — delegate to Application layer
- Domain logic stays in Domain services
- App logic in Application layer
- Infrastructure handles persistence only
- Naming: PascalCase for types, camelCase for locals
- Use primary constructors for dependency injection

### Frontend (TypeScript)
- Use existing components from `frontend/src/components/`
- Follow design token system in `frontend/src/index.css`
- Use `useAsync` hook for data fetching where helpful
- Keep components focused and composable

---

## Completion Checklist

Before claiming a task is complete:

1. [ ] All backend tests pass (`./scripts/test-backend`)
2. [ ] All frontend tests pass (`./scripts/test-frontend`)
3. [ ] Build compiles without errors
4. [ ] Documentation updated if behavior changed
5. [ ] Code follows existing patterns
6. [ ] Authorization properly applied to new endpoints
7. [ ] New features have test coverage
