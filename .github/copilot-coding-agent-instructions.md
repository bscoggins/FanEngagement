# GitHub Copilot Coding Agent Guide — FanEngagement

This guide provides all operational instructions for the GitHub Copilot Coding Agent, including:

- Global rules that apply to every agent
- Specialized agent definitions and boundaries
- Repository architecture and tooling overview
- Required workflows for backend, frontend, authorization, testing, observability, and CI
- Patterns the agent must follow when implementing features, fixes, docs, or tests

This file is the primary behavioral contract for all Copilot agents.

---

## 1. Global Rules for All Copilot Agents

These rules apply to every Copilot agent working in this repository, including default agents and specialized agents (docs-agent, test-agent, lint-agent).

### 1.1 Safety, Scope, and Minimal-Risk Changes

- Prefer small, targeted, reversible changes.
- Avoid broad refactors unless explicitly requested.
- Maintain backward compatibility unless explicitly permitted.
- Never introduce new frameworks, libraries, or architectural patterns without instruction.

### 1.2 Architectural Consistency

- Follow the layering structure of the backend (Api → Application → Domain → Infrastructure).
- Follow established React + TypeScript conventions in the frontend.
- Respect dependency boundaries.
- Align with domain services such as ProposalGovernanceService for proposal logic.

### 1.3 Testing Requirements

- Ensure backend tests pass (dotnet test).
- Ensure frontend tests pass (npm test / Playwright if required).
- Never modify production code to satisfy a flawed test.
- Create tests for all new logic, states, and edge cases.

### 1.4 Documentation Requirements

- Update documentation in the same PR when behavior changes.
- Keep architecture docs aligned with code.
- Ensure code comments (C# XML, TS JSDoc) reflect current behavior.

### 1.5 Security and Secrets

- Never commit secrets or tokens.
- Use placeholders and instruct humans where secrets must be passed.

### 1.6 Pull Request Quality

Each PR must include:

- What changed
- Why it changed
- How to test (commands + steps)
- Risk analysis
- Summary of all added/modified files

### 1.7 Specialized Agent Boundaries

- If a requested change exceeds your specialization, say so.
- docs-agent: documentation only
- test-agent: tests only
- lint-agent: formatting/refactor-only and behavior-preserving

### 1.8 Error Handling & Logging

- Follow centralized exception handling.
- Never add controller try/catch blocks.
- Use structured logging when touching backend logic.

### 1.9 Analytical Responsibility

Before changing code, analyze:

- architecture docs
- domain rules
- existing patterns and DTOs
- surrounding tests

---

## 2. Completion & Handoff Rules

Once the task is complete:

- Stop modifying files.
- Summarize all changes.
- Provide explicit build/test instructions.
- Provide any required follow-up tasks.

---

## 3. Standard Issue Template for the Coding Agent

Issues assigned to the coding agent should follow this format:

```text
#github-pull-request_copilot-coding-agent
```

Title: <meaningful title>

Body:

- Scope:
- Requirements:
- Constraints:
- Testing:
- Completion Criteria:

---

## 4. Specialized Agents

Three custom agents exist. Their detailed role definitions live in:

- agent.md
- .github/agents/*.agent.md

### 4.1 docs-agent

- Writes/updates docs, READMEs, architecture, comments.
- Does not modify runtime logic.

### 4.2 test-agent

- Creates backend xUnit tests, frontend Vitest tests, Playwright E2E.
- May identify bugs; behavior changes must be minimal and isolated.

### 4.3 lint-agent

- Applies formatting, cleanup, and safe refactors.
- Must not change behavior.

All specialized agents must obey the Global Rules.

---

## 5. Repository Overview (Backend + Frontend Structure)

Backend Solution Structure:

- FanEngagement.Api (ASP.NET Core controllers)
- FanEngagement.Application (interfaces, DTOs, validators)
- FanEngagement.Domain (entities, enums, domain services)
- FanEngagement.Infrastructure (EF Core, persistence, services)
- FanEngagement.Tests (xUnit tests)

Frontend:

- React 19 + TypeScript + Vite
- Vitest unit tests, Playwright E2E
- Strong permission model and route guards

Runtime:

- .NET 9
- Postgres via Docker Compose
- Automatic migrations applied at startup

---

## 6. Local Build/Test/Run Instructions (Agent Must Follow)

### 6.1 Docker Compose

```sh
docker compose up --build
docker compose down -v
```

### 6.2 Backend

```sh
dotnet build backend/FanEngagement.sln
dotnet test backend/FanEngagement.Tests
```

### 6.3 Frontend

```sh
cd frontend
npm ci
npm run build
npm test
```

---

## 7. Development Scripts

The repo includes scripts in ./scripts/ which the agent may reference.

Examples:

```sh
./scripts/dev-up
./scripts/dev-down
./scripts/test-backend
./scripts/test-frontend
```

---

## 8. Authorization Model (Agent Must Respect When Modifying Backend)

FanEngagement uses a two-tier role model:

- Global roles: User / Admin
- Organization roles: Member / OrgAdmin

Policies:

- GlobalAdmin
- OrgMember
- OrgAdmin
- ProposalManager

Rules:

- Admins bypass org-level checks.
- OrgAdmin required for writes.
- OrgMember required for viewing org data.
- Proposal transitions must use ProposalGovernanceService.

The agent must apply correct authorization attributes on new endpoints.

---

## 9. Organization Workflow Requirements

Organization creation:

- Only GlobalAdmins may create organizations.
- Creator becomes OrgAdmin automatically.
- Stored transactionally.
- Must update corresponding frontend pages and permissions.

---

## 10. Multi-Organization Frontend Context Rules

The agent must follow:

- Use useActiveOrganization() hook
- Respect stored organization context
- Use route-based org selection when applicable
- Apply branding via useOrgBranding()

---

## 11. Frontend Permission Model

The agent must:

- Use route guards (AdminRoute, OrgAdminRoute, ProtectedRoute)
- Use usePermissions() for conditional UI
- Use IfGlobalAdmin, IfOrgAdmin, IfOrgMember components

Unauthorized UI paths must not be exposed.

---

## 12. Proposal Lifecycle & Governance

The agent must:

- Use domain services for all lifecycle changes
- Never set proposal status manually
- Ensure snapshot, quorum, voting power logic is correct
- Maintain architecture rules

Transitions:

- Draft → Open → Closed → Finalized

---

## 13. Instructions for Backend Feature Implementation

### 13.1 API Pattern

1. Define controller action in Api
2. Add/modify Application interfaces/DTOs
3. Update Domain logic if needed
4. Update Infrastructure services
5. Add validators
6. Add or update tests
7. Document changes

The agent must follow this sequence.

---

## 14. Instructions for Frontend Feature Implementation

### 14.1 Standard Page Requirements

- Use LoadingSpinner
- Use ErrorMessage (+ retry)
- Use EmptyState where appropriate
- Use user notifications
- Handle async button state

### 14.2 API Integration

- Use apiClient wrappers
- Ensure new API endpoints exist and match backend

### 14.3 Routes & Guards

- Must use correct route tree (/platform-admin, /admin, /me)

---

## 15. EF Core Migrations

Agent must:

- Create migrations for model changes
- Include migration files in PR
- Use correct startup project in commands

---

## 16. Testing Strategy

### 16.1 Backend

- Integration tests must use WebApplicationFactory
- Prefer deterministic data dependencies

### 16.2 Frontend

- Unit tests: Vitest + RTL
- E2E: Playwright
- Avoid brittle selectors; use test IDs as needed

---

## 17. Observability Requirements

Agent must add structured logging for:

- Proposal transitions
- Background services
- External API calls

Metrics rules:

- Use counters ending with _total
- Use tags (success, event_type, organization_id)

---

## 18. Background Services Requirements

Agent must:

- Add structured logs to background services
- Instrument operations with metrics
- Respect cancellation tokens
- Avoid heavy synchronous IO

---

## 19. Pagination and Filtering Requirements

Agent must:

- Add pagination (page, pageSize) for all new list endpoints
- Add filters where applicable
- Ensure backward compatibility
- Add integration and frontend tests

---

## 20. Coding Conventions

- Controllers stay thin
- Domain logic stays in Domain services
- App logic in Application
- Infra handles persistence only
- Naming: PascalCase types, camelCase locals

---

## 21. Documentation & OpenAPI

Agent must:

- Maintain OpenAPI annotations
- Document changed endpoints in PRs

---

## 22. How to Trigger the Copilot Coding Agent

Include this hashtag in an issue or comment:

`#github-pull-request_copilot-coding-agent`

Provide clear scope, requirements, constraints, and testing needs.

---

## 23. Centralized Navigation Configuration

### 23.1 Core Rules

- **Single Source of Truth**: Define all navigation items in `frontend/src/navigation/navConfig.ts`. Never hardcode sidebar links.
- **Layout Integration**: Rely on `AdminLayout` and `PlatformAdminLayout` to automatically render items from config.
- **Role-Based Visibility**: Control access via `roles` (PlatformAdmin, OrgAdmin, Member) and `scope` (global, org, user).

### 23.2 Implementation Patterns

- **Adding Items**: Add `NavItem` objects to `navConfig.ts` with unique `id`, `path`, and `order`.
- **Consuming Config**: Use `useNavigation()` hook to access resolved items and home routes.
- **Filtering**: Use `getVisibleNavItems(context, filter)` for custom lists.
- **Testing**: Add visibility tests in `navConfig.test.ts` for every new item.

### 23.3 Routing Logic

- **Home Route**: Use `getDefaultHomeRoute()` for landing logic (PlatformAdmin → `/platform-admin/dashboard`, OrgAdmin → `/admin`, Member → `/me/home`).
- **Redirects**: Ensure `routeUtils.ts` logic mirrors navigation config for post-login redirects.

