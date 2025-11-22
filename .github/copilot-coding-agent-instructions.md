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
   - `GET /users` → List users (returns User objects with role field: User or Admin)
   - `GET /users/{id}` → Get user by ID (returns User object with role field)
   - `GET /users/{id}/memberships` → Get user's organization memberships with organization details
   - `PUT /users/{id}` → Update user (accepts optional role field for role changes)
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
   - `GET /proposals/{proposalId}/votes/{userId}` → Get user's vote on a proposal
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

## Roles & Permissions Model

FanEngagement defines a **two-tier role model** with global roles and organization-scoped roles. **⚠️ IMPORTANT:** Authorization enforcement is currently incomplete - many endpoints lack proper role/membership checks.

### Global Roles (User.Role - UserRole enum)
Located in `backend/FanEngagement.Domain/Enums/UserRole.cs`:
- **User** (`UserRole.User` = 0): Default role. Can manage own profile, view own memberships, participate in organizations they're members of.
- **Admin** (`UserRole.Admin` = 1): Platform-wide administrator. Should have implicit permission for all actions regardless of organization membership. Auto-seeded in Development as `admin@example.com`.

### Organization Roles (OrganizationMembership.Role - OrganizationRole enum)
Located in `backend/FanEngagement.Domain/Enums/OrganizationRole.cs`:
- **Member** (`OrganizationRole.Member` = 1): Regular organization member. Should be able to view org details, share balances, proposals, and vote on proposals.
- **OrgAdmin** (`OrganizationRole.OrgAdmin` = 0): Organization administrator. Should be able to manage org settings, memberships (cannot modify their own role), share types, proposals, and webhooks for their organization.

### Current Implementation Status

> **✅ COMPLETE:** Authorization policies and handlers are now fully implemented and enforced across all endpoints.

**Authorization has been implemented with:**
1. Custom authorization requirements and handlers for organization membership/role checks
2. Four comprehensive policies: GlobalAdmin, OrgMember, OrgAdmin, ProposalManager
3. Policy enforcement on all controllers with appropriate granularity
4. Comprehensive unit and integration tests (30 tests total)

### Authorization Policies

1. **GlobalAdmin** - Requires `UserRole.Admin`
   - Platform-wide administrator access
   - Bypasses all organization-level access controls

2. **OrgMember** - Requires organization membership (or GlobalAdmin)
   - User must be a member of the organization specified in the route
   - Automatically succeeds for GlobalAdmins

3. **OrgAdmin** - Requires `OrganizationRole.OrgAdmin` for the organization (or GlobalAdmin)
   - User must be an OrgAdmin of the specific organization in the route
   - Automatically succeeds for GlobalAdmins

4. **ProposalManager** - Requires proposal creator, OrgAdmin, or GlobalAdmin
   - Allows proposal creator, OrgAdmins of the org, or GlobalAdmins

### Authorization Handlers

Located in `backend/FanEngagement.Api/Authorization/`:
- `OrganizationMemberHandler` - Checks membership from `organizationId`/`id` route param
- `OrganizationAdminHandler` - Checks OrgAdmin role from route param
- `ProposalMemberHandler` - Resolves org from `proposalId` and checks membership
- `ProposalManagerHandler` - Checks creator/OrgAdmin/GlobalAdmin for proposals

### Current Authorization by Controller

- **UsersController**: All operations except Create and GetUserMemberships require GlobalAdmin
- **OrganizationsController**: Create requires GlobalAdmin, GetById requires OrgMember, Update requires OrgAdmin, List is public
- **MembershipsController**: Create/Delete require OrgAdmin, GetAll/GetByUser require OrgMember
- **ShareTypesController**: Create/Update require OrgAdmin, Get operations require OrgMember
- **ShareIssuancesController**: Create requires OrgAdmin, Get operations require OrgMember
- **ProposalsController**: View/Vote/Results require OrgMember, Update/Close/Options require ProposalManager
- **OrganizationProposalsController**: Create/List require OrgMember
- **WebhookEndpointsController**: All operations require OrgAdmin
- **OutboundEventsController**: All operations require OrgAdmin
- **AuthController/HealthController**: Public endpoints (no authorization)

### Intended Authorization Principles (Implemented)

1. **Global Admin Override**: Users with `UserRole.Admin` have implicit permission for all actions, regardless of organization membership.
   > **Security Note:** Global Admins bypass all organization-level access controls and should be granted only to trusted platform operators.

2. **Organization Membership Required**: For org-scoped actions, user must have an `OrganizationMembership` record (unless Global Admin).

3. **Organization Role Check**: Extract `organizationId` from route → query `OrganizationMembership` → check `Role` property → grant/deny based on policy.

4. **Self-Access**: Users can access their own resources (profile, memberships, votes, balances) via manual checks in controllers.

5. **Creator Privileges**: Proposal creators can manage their proposals even if not OrgAdmins (via ProposalManager policy).

6. **Privilege Escalation Prevention**: Implemented at application layer (no API to update membership roles - must delete and recreate).

### Current Implementation Approach

- JWT authentication configured with role claims (see `Program.cs`)
- Policy-based authorization using custom requirements/handlers ✅
- All endpoints have appropriate authorization policies applied ✅
- Comprehensive test coverage (13 unit tests + 17 integration tests) ✅

### When Adding New Features

**Always apply authorization to new endpoints:**

1. **Determine the appropriate policy** based on the operation:
   - User management → `[Authorize(Policy = "GlobalAdmin")]`
   - Organization management (writes) → `[Authorize(Policy = "OrgAdmin")]`
   - Organization management (reads) → `[Authorize(Policy = "OrgMember")]`
   - Proposal management (writes) → `[Authorize(Policy = "ProposalManager")]`
   - Proposal viewing/voting → `[Authorize(Policy = "OrgMember")]`
   - Public endpoints → `[AllowAnonymous]`

2. **Apply the policy attribute:**
   ```csharp
   [HttpPost]
   [Authorize(Policy = "OrgAdmin")]
   public async Task<ActionResult> Create(...)
   ```

3. **Ensure route parameters match policy expectations:**
   - `OrgMember` and `OrgAdmin` expect `organizationId` or `id` in route
   - `ProposalManager` expects `proposalId` in route
   - GlobalAdmin doesn't require specific route parameters

4. **Add authorization tests:**
   - Unit tests for new authorization handlers (if creating custom ones)
   - Integration tests covering authorized and unauthorized access scenarios

5. **Document in PR:**
   - List which policies are applied to new endpoints
   - Note any authorization decisions

**Example patterns:**

```csharp
// Organization-scoped controller
[ApiController]
[Route("organizations/{organizationId:guid}/items")]
[Authorize(Policy = "OrgMember")]  // Base requirement
public class ItemsController : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = "OrgAdmin")]  // Override for writes
    public async Task<ActionResult> Create(...)
    
    [HttpGet]
    public async Task<ActionResult> GetAll(...)  // Inherits OrgMember
}

// User management
[HttpGet]
[Authorize(Policy = "GlobalAdmin")]
public async Task<ActionResult> GetAllUsers(...)

// Self-access with manual checks
[HttpGet("{id:guid}/data")]
[Authorize]
public async Task<ActionResult> GetUserData(Guid id, ...)
{
    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var requestingUserId))
        return Forbid();
    
    if (requestingUserId != id && !User.IsInRole("Admin"))
        return Forbid();
    // ...
}
```

For the complete current vs. intended permissions matrix, see **Roles & Permissions** in `docs/architecture.md`.

### Frontend Permission Helpers

> **✅ COMPLETE:** Frontend permission system is now fully implemented with hooks, components, and route guards.

The frontend provides comprehensive permission checking aligned with backend authorization:

**Permission Hook (`usePermissions`):**

Located in `frontend/src/hooks/usePermissions.ts`:
- Fetches user's organization memberships on mount
- Provides permission checking functions:
  - `isGlobalAdmin()`: Returns true for users with Admin role
  - `isOrgAdmin(orgId)`: Returns true for GlobalAdmins or OrgAdmins of specific org
  - `isOrgMember(orgId)`: Returns true for GlobalAdmins or members/admins of specific org
- Exposes `memberships` array and `refreshMemberships()` function

**Usage Example:**

```typescript
import { usePermissions } from '../hooks/usePermissions';

const MyComponent = () => {
  const { isGlobalAdmin, isOrgAdmin, isOrgMember, memberships } = usePermissions();
  
  const handleAction = () => {
    if (!isOrgAdmin(orgId)) {
      alert('You must be an organization admin');
      return;
    }
    // Perform admin action
  };
};
```

**Permission Wrapper Components:**

Located in `frontend/src/components/PermissionWrappers.tsx`:

```tsx
import { IfGlobalAdmin, IfOrgAdmin, IfOrgMember } from '../components/PermissionWrappers';

// Show button only to GlobalAdmins
<IfGlobalAdmin>
  <button>Platform Admin Action</button>
</IfGlobalAdmin>

// Show button only to OrgAdmins of this org
<IfOrgAdmin orgId={orgId}>
  <button>Manage Organization</button>
</IfOrgAdmin>

// Show content only to members of this org
<IfOrgMember orgId={orgId}>
  <div>Member-only content</div>
</IfOrgMember>
```

**Route Guards:**

Located in `frontend/src/components/`:

1. **`AdminRoute`**: Requires GlobalAdmin role (platform-level admin pages)
2. **`OrgAdminRoute`**: Requires GlobalAdmin OR OrgAdmin for specific org (org-scoped admin pages)
3. **`ProtectedRoute`**: Requires authentication (any authenticated user)

```tsx
// In routes/index.tsx
{
  path: 'organizations/:orgId/edit',
  element: (
    <OrgAdminRoute>
      <AdminOrganizationEditPage />
    </OrgAdminRoute>
  ),
}
```

**UI Permission Indicators:**

- **AdminLayout**: Shows red "Platform Admin" badge for GlobalAdmins; hides Users/Organizations/Dev Tools nav from non-GlobalAdmins
- **AdminDashboardPage**: Shows different content based on role (platform shortcuts for GlobalAdmins, org list for OrgAdmins, no-access message for regular users)
- **MyOrganizationPage**: Shows blue "Org Admin" badge and admin action links for OrgAdmins

**When Adding New Frontend Features:**

1. **Determine required permissions** based on backend authorization
2. **Apply route guard** if entire page requires specific role:
   - GlobalAdmin → wrap in `<AdminRoute>`
   - OrgAdmin → wrap in `<OrgAdminRoute>`
   - Any authenticated → wrap in `<ProtectedRoute>`
3. **Use permission helpers** for conditional UI elements:
   - Buttons/actions → use `usePermissions()` hook to enable/disable
   - Sections → use `<IfGlobalAdmin>`, `<IfOrgAdmin>`, or `<IfOrgMember>` wrappers
4. **Add visual indicators** where appropriate (badges, labels)
5. **Test permission logic** with unit tests using mocked `usePermissions` hook

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
   - For admin features, use the `/admin` route tree with `AdminLayout` and `AdminRoute` for access control.
   - Current admin routes:
    - `/admin` (dashboard)
    - `/admin/users` (user list)
    - `/admin/users/:userId` (user detail/edit)
    - `/admin/organizations` (organizations list)
    - `/admin/organizations/:orgId/edit` (edit organization)
    - `/admin/organizations/:orgId/memberships` (manage organization memberships)
    - `/admin/organizations/:orgId/share-types` (manage organization share types)
    - `/admin/organizations/:orgId/proposals` (list proposals for organization)
    - `/admin/organizations/:orgId/proposals/:proposalId` (view/edit proposal, manage options, view results)
    - `/admin/dev-tools`
   - For user self-service features, use the `/me` route tree with `ProtectedRoute` (not AdminRoute).
   - Current user self-service routes:
    - `/me` (account page - view/edit profile)
    - `/me/organizations` (list user's organization memberships)
    - `/me/organizations/:orgId` (view org details, share balances, active proposals)
    - `/me/proposals/:proposalId` (view proposal, cast vote, see results)
2. API Integration
   - Add/update `frontend/src/api/*Api.ts` using the shared `apiClient` (Axios).
   - Available API clients: `usersApi`, `authApi`, `adminApi`, `membershipsApi`, `organizationsApi`, `shareTypesApi`, `proposalsApi`, `shareBalancesApi`
   - Ensure backend endpoints exist and are documented.
3. Auth
   - Use `AuthContext` and `ProtectedRoute` for protected pages.
   - Use `AdminRoute` for admin-only pages (checks both authentication and Admin role).
   - Admin navigation link appears in main layout only for users with Admin role.
   - User self-service links (My Account, My Organizations) appear for all authenticated users.
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

## Recent Architectural Additions

### Admin Proposal Management (Implemented)
- Added `frontend/src/api/proposalsApi.ts` for proposal CRUD operations
- Created `AdminOrganizationProposalsPage` for listing proposals per organization
- Created `AdminProposalDetailPage` for viewing/editing proposals, managing options, and viewing results
- Form accessibility: All inputs use `htmlFor` and `id` attributes for proper label association
- Status-based UI: Different colors and controls for Draft/Open/Closed/Finalized statuses
- Results visualization: Vote counts, voting power, and percentage bars for closed proposals
- Routes: `/admin/organizations/:orgId/proposals` and `/admin/organizations/:orgId/proposals/:proposalId`
- Tests: 11 new tests added covering proposal list, create, edit, options, and results views

## Azure Notes (If Applicable)

- If tasks involve Azure (deployments, Bicep/Terraform, Functions, or Static Web Apps), follow Azure best practices and prefer verified modules/templates. Include deployment steps and validate with a dry run before changes.

---
This guide is designed for the GitHub Copilot coding agent to perform autonomous, safe changes with clear build/test guarantees and predictable PRs.
