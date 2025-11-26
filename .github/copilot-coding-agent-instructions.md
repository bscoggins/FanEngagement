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
   - `POST /organizations/{organizationId}/proposals` → Create proposal (starts in Draft status)
   - `GET /organizations/{organizationId}/proposals` → List proposals by organization
   - `GET /proposals/{proposalId}` → Get proposal by ID
   - `PUT /proposals/{proposalId}` → Update proposal
   - `POST /proposals/{proposalId}/open` → Open proposal (requires 2+ options, captures voting power snapshot)
   - `POST /proposals/{proposalId}/close` → Close proposal (computes results, checks quorum)
   - `POST /proposals/{proposalId}/finalize` → Finalize proposal (terminal state)
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
   - `GET /organizations/{organizationId}/outbound-events` → List outbound events (filter by status, eventType, fromDate, toDate)
   - `GET /organizations/{organizationId}/outbound-events/{eventId}` → Get outbound event details (includes payload, lastError)
   - `POST /organizations/{organizationId}/outbound-events/{eventId}/retry` → Retry failed outbound event (resets to Pending)
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

### Organization Creation and Onboarding

**✅ IMPLEMENTED:** Organization creation with automatic OrgAdmin membership.

#### Backend Implementation

**Who Can Create Organizations:**
- Only users with `UserRole.Admin` (GlobalAdmin) can create organizations
- Enforced via `[Authorize(Policy = "GlobalAdmin")]` on `POST /organizations`
- Future enhancement: Could enable self-service for all users with approval workflow

**Endpoint:** `POST /organizations`
```csharp
// Request
{
  "name": "Organization Name",        // Required, max 200 chars
  "description": "Description text"   // Optional, max 1000 chars
}

// Controller extracts current user ID from JWT claims
var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

// Service creates organization AND OrgAdmin membership transactionally
var organization = await organizationService.CreateAsync(request, creatorUserId, cancellationToken);
```

**Automatic OrgAdmin Membership:**
- `OrganizationService.CreateAsync()` automatically creates an `OrganizationMembership` for the creator
- Membership has `OrganizationRole.OrgAdmin` role
- Both organization and membership are saved in a single transaction
- Creator immediately has full administrative control

**Implementation Details:**
- Service validates that creator user exists before creating org
- Returns `InvalidOperationException` if creator doesn't exist
- JSON serialization uses `ReferenceHandler.IgnoreCycles` to handle navigation properties

**Testing:**
- `backend/FanEngagement.Tests/OrganizationCreationTests.cs`:
  - Tests GlobalAdmin creating org + membership
  - Tests non-admin rejection (403 Forbidden)
  - Tests unauthenticated rejection (401 Unauthorized)
  - Tests validation (empty name, too long name)
  - Tests multiple org creation by same admin

#### Frontend Implementation

**UI Location:** `/admin/organizations` (AdminOrganizationsPage)

**Features:**
- "Create Organization" button (visible to GlobalAdmin only via AdminRoute guard)
- Collapsible create form with Name and Description fields
- On success: navigates to `/admin/organizations/{orgId}/edit`
- Uses notification system for feedback (success toast, error toast)
- Properly disables form during submission

**API Client:**
```typescript
import { organizationsApi } from '../api/organizationsApi';

// Create organization
const newOrg = await organizationsApi.create({
  name: 'Organization Name',
  description: 'Optional description'
});
// Returns Organization object with id, name, description, createdAt, logoUrl, primaryColor, secondaryColor
```

**Testing:**
- `frontend/src/pages/AdminOrganizationsPage.test.tsx`:
  - Tests button visibility
  - Tests form show/hide
  - Tests successful creation + navigation
  - Tests error handling
  - Tests validation
  - Tests loading state

#### When Building Organization-Related Features

**Always respect these rules:**

1. **Organization Creation:**
   - Only GlobalAdmins can create organizations
   - Always create OrgAdmin membership for creator
   - Save org + membership transactionally
   - Optionally include branding fields (logoUrl, primaryColor, secondaryColor)

2. **Initial Organization Setup (by creator/OrgAdmin):**
   - Add members: `POST /organizations/{orgId}/memberships`
   - Configure share types: `POST /organizations/{orgId}/share-types`
   - Issue shares: `POST /organizations/{orgId}/share-issuances`
   - Create proposals: `POST /organizations/{orgId}/proposals`
   - Configure webhooks (optional): `POST /organizations/{orgId}/webhooks`
   - Configure branding: Update organization with logoUrl and color fields

3. **Organization Branding:**
   - Organizations have optional branding fields: `logoUrl`, `primaryColor`, `secondaryColor`
   - Branding is displayed on organization-scoped pages using `useOrgBranding` hook
   - Logo URL must be a valid absolute HTTP/HTTPS URL (validated on backend)
   - Colors can be hex, RGB, or CSS color values (max 50 chars)
   - Frontend provides defaults (#0066cc primary, #6c757d secondary) if not set
   - Admin edit page includes branding controls with color pickers and logo preview

4. **Authorization:**
   - Organization creation requires GlobalAdmin policy
   - Organization management (edit, add members, update branding) requires OrgAdmin policy
   - Organization viewing requires OrgMember policy

5. **Frontend Branding Usage:**
   - Always use `useOrgBranding(orgId)` hook when building org-scoped pages
   - Apply branding to headers, primary buttons, and accent elements
   - Design UI to work with or without branding (use defaults)
   - Show logo in headers when available
   - Use primary color for header backgrounds and primary action buttons

6. **Future Enhancements:**
   - Could add self-service org creation for all users
   - Could add approval workflow for new organizations
   - Could add organization types (Sports Club, Non-Profit, etc.)
   - Could add default share types on org creation
   - Could add onboarding wizard
   - Could add file upload for logos (currently URL-based)


**Documentation:**
- Complete details: `docs/architecture.md` → **Organization Onboarding** section
- Usage guide: `.github/copilot-instructions.md` → **Organization Onboarding** section

### Organization Context Selection and Multi-Organization Support

> **✅ IMPLEMENTED:** Users can belong to multiple organizations and switch between them via organization context.

**Core Principles:**
1. **Multi-Org Membership:** Users can be members of multiple organizations simultaneously
2. **Active Organization Context:** Frontend maintains an active organization that determines which org's data is displayed
3. **Auto-Selection:** Single-org users have their org auto-selected; multi-org users auto-select first org or restore previous selection
4. **Persistence:** Active organization is persisted to localStorage across page reloads
5. **Organization Switcher:** Multi-org users see a dropdown selector in the header to switch organizations

#### Backend Implementation

**API Endpoint:**
- `GET /users/me/organizations` → Returns current user's organization memberships with org details and roles
- Uses JWT token to identify current user automatically
- Returns `MembershipWithOrganizationDto[]` with org ID, name, and user's role

**Authorization:**
- Requires authentication via `[Authorize]` attribute
- Returns only memberships for the authenticated user

#### Frontend Implementation

**Organization Context (`OrgContext`):**
- Provides `useActiveOrganization()` hook for accessing active organization
- Automatically fetches user's memberships on authentication
- Auto-selects first organization on login (or restores previous selection from localStorage)
- Persists active org selection to localStorage
- Clears selection on logout

**Organization Selector (`OrganizationSelector`):**
- Dropdown selector shown in Layout header for authenticated users
- Only displays when `hasMultipleOrgs === true` (user belongs to 2+ organizations)
- Shows org name with role badge (Admin/Member)
- Updates active org context on selection change

**Usage Pattern:**
```typescript
import { useActiveOrganization } from '../contexts/OrgContext';

const MyOrgPage = () => {
  const { activeOrg, hasMultipleOrgs } = useActiveOrganization();

  // Use active org for API calls
  const proposals = await proposalsApi.getByOrganization(activeOrg.id);

  return (
    <div>
      <h1>{activeOrg?.name}</h1>
      <p>Your role: {activeOrg?.role}</p>
    </div>
  );
};
```

#### When Building Org-Scoped Features

**Always follow these rules:**

1. **Use Active Organization Context:**
   - Import and use `useActiveOrganization()` hook in org-scoped pages
   - Use `activeOrg.id` for API calls when not using explicit route param
   - Check `activeOrg?.role` for permission decisions

2. **Handle No Active Org:**
   - Check if `activeOrg` is null and show appropriate UI
   - Show "Please select an organization" message if needed

3. **Respect Explicit Route Params:**
   - If route includes `organizationId`, use that ID for API calls
   - Optionally synchronize active org with route param on navigation

4. **Show Org Selector Conditionally:**
   - Only show selector when `hasMultipleOrgs === true`
   - Single-org users don't need to see the selector

5. **Permission Checks:**
   - Use `isOrgAdmin(activeOrg.id)` to check admin permissions
   - Use `isOrgMember(activeOrg.id)` to check membership
   - Use `activeOrg.role` directly for role-specific UI

6. **Branding Integration:**
   - Use `useOrgBranding(activeOrg.id)` to fetch branding for active org
   - Apply branding to headers and primary actions

**Example Patterns:**

```typescript
// Pattern 1: Use active org for data fetching
const MyComponent = () => {
  const { activeOrg } = useActiveOrganization();
  const [data, setData] = useState([]);

  useEffect(() => {
    if (activeOrg) {
      proposalsApi.getByOrganization(activeOrg.id).then(setData);
    }
  }, [activeOrg]);
};

// Pattern 2: Sync active org with route param
const OrgDetailPage = () => {
  const { orgId } = useParams();
  const { activeOrg, setActiveOrg, memberships } = useActiveOrganization();

  useEffect(() => {
    if (orgId && activeOrg?.id !== orgId) {
      const membership = memberships.find(m => m.organizationId === orgId);
      if (membership) {
        setActiveOrg({
          id: membership.organizationId,
          name: membership.organizationName,
          role: membership.role,
        });
      }
    }
  }, [orgId, activeOrg, memberships, setActiveOrg]);
};

// Pattern 3: Check permissions in active org
const AdminPanel = () => {
  const { activeOrg } = useActiveOrganization();
  const { isOrgAdmin } = usePermissions();

  if (!activeOrg) return <div>Select an organization</div>;
  if (!isOrgAdmin(activeOrg.id)) return <div>Admin access required</div>;

  return <div>Admin controls for {activeOrg.name}</div>;
};
```

**Documentation:**
- Complete details: `docs/architecture.md` → **Multi-Organization Membership and Context Selection** section
- Usage guide: `.github/copilot-instructions.md` → **Organization Context Selection and Switching** section

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

### Proposal Lifecycle & Governance UX Patterns

> **✅ COMPLETE:** Frontend now provides comprehensive UX for proposal lifecycle, eligibility, and results.

**Reusable Components for Proposals:**

- **`ProposalStatusBadge`**: Displays colored status badge (Draft/Open/Closed/Finalized)
  - Usage: `<ProposalStatusBadge status={proposal.status} />`
  - Colors: Draft (gray), Open (green), Closed (red), Finalized (blue)

- **`ProposalTimingInfo`**: Shows relative timing messages ("Opens in 2 hours", "Closes in 3 days", "Currently accepting votes")
  - Usage: `<ProposalTimingInfo status={proposal.status} startAt={proposal.startAt} endAt={proposal.endAt} />`
  - Auto-updates messaging based on status and timing

- **`QuorumInfo`**: Displays quorum requirement, status, and voting power metrics
  - Usage: `<QuorumInfo quorumRequirement={...} quorumMet={...} totalVotesCast={...} eligibleVotingPowerSnapshot={...} />`
  - Shows: requirement %, eligible voting power, required votes, total votes cast, quorum met status

**Utility Functions (`proposalUtils.ts`):**

- `checkVotingEligibility(status, startAt, endAt, hasVoted, votingPower)`: Returns eligibility status with reason
- `formatRelativeTime(dateStr)`: Formats dates as relative time ("in 2 hours", "3 days ago")
- `getProposalTimingMessage(status, startAt, endAt)`: Gets human-readable timing message
- `isProposalOpenForVoting(status, startAt, endAt)`: Checks if proposal is currently accepting votes
- `getStatusBadgeColor(status)`: Gets color for status badge
- `getStatusLabel(status)`: Gets display label for status

**User-Facing Pages (Member Self-Service):**

- **`MyProposalPage`** (`/me/proposals/:proposalId`):
  - Shows proposal details with status badge and timing
  - Displays user's voting power and eligibility status
  - For eligible users: shows radio buttons to select option and "Cast Vote" button
  - For ineligible users: shows options without voting controls + reason (already voted, no voting power, wrong timing, etc.)
  - Shows real-time results for Open proposals, final results for Closed/Finalized
  - Displays winning option with trophy emoji
  - Shows quorum information for Closed/Finalized proposals

**Admin Pages:**

- **`AdminProposalDetailPage`** (`/admin/organizations/:orgId/proposals/:proposalId`):
  - Shows lifecycle action buttons based on state:
    - Draft → "Open Proposal" button (green)
    - Open → "Close Proposal" button (red)
    - Closed → "Finalize" button (gray)
  - Displays governance metadata: eligible voting power snapshot, total votes cast, quorum met status, closed at, winning option
  - Shows proposal timing with `ProposalTimingInfo`
  - Displays quorum information with `QuorumInfo` component for Closed/Finalized proposals

- **`AdminOrganizationProposalsPage`** (`/admin/organizations/:orgId/proposals`):
  - Lists proposals with status badges
  - Shows timing info for each proposal
  - Displays quorum met status for Closed/Finalized proposals

**Testing Proposals:**

When testing proposal pages:
- Use future dates for `startAt` (e.g., `2020-01-15`) and far future dates for `endAt` (e.g., `2099-02-15`) to ensure proposals are within voting period
- Mock `shareBalancesApi.getBalances()` to provide user voting power
- Mock `proposalsApi.getResults()` for proposals showing results (Open/Closed/Finalized status)
- Test eligibility scenarios: eligible to vote, already voted, no voting power, wrong timing

**When Adding/Modifying Proposal Features:**

1. **Use existing components** (`ProposalStatusBadge`, `ProposalTimingInfo`, `QuorumInfo`) for consistency
2. **Check eligibility** using `checkVotingEligibility()` before showing voting UI
3. **Show results** for Open/Closed/Finalized proposals (per architecture docs)
4. **Display governance fields** from backend: `winningOptionId`, `quorumMet`, `totalVotesCast`, `eligibleVotingPowerSnapshot`, `closedAt`
5. **Handle timing** properly: proposals can have `startAt` (not yet started) and `endAt` (voting ended) constraints
6. **Respect lifecycle** state machine: Draft → Open → Closed → Finalized (no skipping states)

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
- For major user journeys (admin/member/org governance, voting, webhook visibility), extend Playwright E2E coverage under `frontend/e2e` to validate UI + backend integration. Seed via `/admin/seed-dev-data` and prefer unique identifiers to avoid collisions.

Common commands:
 
```sh
dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj -c Release
```

## E2E Playwright Conventions (Frontend)

When extending end-to-end coverage under `frontend/e2e`, follow these patterns to keep tests reliable and fast:

- Headed locally, headless on CI: The Playwright config runs headed locally (non-CI) and headless on CI automatically.
- Split long journeys: Use `test.describe.serial` to group related tests that share state (e.g., orgId, proposalId) and isolate failures across smaller `test()` cases.
- Deterministic navigation: Await the `POST` response JSON (e.g., proposal creation) and navigate using the returned ID rather than relying on UI timing.
- Confirm dialogs: Mutating admin actions (Open, Close, Finalize) show a confirm dialog—accept it before asserting status or waiting on the network response.
- Network waits over sleeps: Prefer `page.waitForResponse` and assert 200/201 for key POSTs.
- `/proposals/:id/options`
- `/proposals/:id/open`
- `/proposals/:id/close`
- `/proposals/:id/finalize`
- Stable selectors with `data-testid`: Add test IDs to primary headings and critical actions. Use role-based selectors for tables (`getByRole('cell', ...)`) to avoid strict text conflicts.
- Option form toggle: Ensure the “Add Option” form is opened before filling inputs.

### Local E2E Run

```sh
pushd frontend
VITE_API_BASE_URL=http://localhost:8080 npx playwright test e2e/admin-governance.spec.ts --reporter=list
popd
```

### Test Data & Seeding

- Seed dev data via `POST /admin/seed-dev-data` using the default admin and member accounts.
- Use unique identifiers (timestamps) in names to avoid cross-test collisions.


## Validation & Error Handling

### Request Validation

The API uses FluentValidation for automatic request validation. All request DTOs must have validators in `backend/FanEngagement.Application/Validators/`.

**When adding a new endpoint that accepts a request DTO:**

1. Create a validator class (if one doesn't exist):
```csharp
public class CreateMyRequestValidator : AbstractValidator<CreateMyRequest>
{
    public CreateMyRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(100).WithMessage("Name must not exceed 100 characters.");
    }
}
```

2. Validators are auto-discovered - no manual registration needed

### Error Handling

**IMPORTANT: Do NOT use try-catch blocks in controllers for business logic exceptions.**

The `GlobalExceptionHandlerMiddleware` handles all exceptions and returns RFC 7807 ProblemDetails responses.

**Services should throw exceptions for business rule violations:**
- `InvalidOperationException` for domain validation errors
- `ArgumentException` for invalid arguments
- Let other exceptions bubble up naturally

**Example:**
```csharp
// Service method
public async Task<Proposal> UpdateAsync(Guid id, UpdateProposalRequest request)
{
    var proposal = await _context.Proposals.FindAsync(id);
    if (proposal?.Status == ProposalStatus.Closed)
    {
        throw new InvalidOperationException("Cannot update a closed proposal.");
    }
    // ... update logic
}

// Controller (no try-catch needed)
[HttpPut("{id}")]
public async Task<ActionResult> Update(Guid id, UpdateProposalRequest request)
{
    var result = await _proposalService.UpdateAsync(id, request);
    return result is null ? NotFound() : Ok(result);
}
```

**Error responses are automatically formatted as:**
- Validation errors → HTTP 400 with field-level error details
- Domain errors (InvalidOperationException) → HTTP 400 with error message
- Not found → HTTP 404
- Server errors → HTTP 500

## Coding Conventions

- Keep controllers thin; business logic belongs in Application/Infrastructure services.
- Prefer async APIs and pass `CancellationToken` through layers.
- Return appropriate HTTP status codes (`201 Created`, `404 NotFound`, `204 NoContent`, etc.).
- **Do NOT use try-catch in controllers** - let exceptions bubble to global handler.
- Create FluentValidation validators for all request DTOs.
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

## Domain Services and Governance Rules

### Proposal Governance Model

FanEngagement implements comprehensive governance rules for proposals. These rules are documented in `docs/architecture.md` under "Proposal Governance Rules" and enforced through domain services.

**Key Concepts:**
- **Lifecycle**: Draft → Open → Closed → Finalized (strict state machine)
- **Voting Eligibility**: Members with voting power > 0 in the organization
- **Quorum**: Configurable percentage of eligible voting power required
- **Result Computation**: Winning option determined by highest voting power, quorum validation
- **Result Visibility**: Real-time for Open proposals, always visible for Closed/Finalized

### Domain Services Location

Domain services are pure business logic with no infrastructure dependencies:
- **Location**: `backend/FanEngagement.Domain/Services/`
- **Purpose**: Encapsulate complex business rules, state transitions, computations
- **Testing**: Unit testable without database or HTTP context

### ProposalGovernanceService

**File**: `backend/FanEngagement.Domain/Services/ProposalGovernanceService.cs`

This service manages ALL proposal lifecycle transitions and governance rule validation.

**CRITICAL RULES FOR ALL PROPOSAL OPERATIONS:**

1. **State Transitions**:
   - ALWAYS use `ValidateStatusTransition()` before changing `Proposal.Status`
   - NEVER directly set `proposal.Status = newStatus` without validation
   - Allowed transitions only: Draft→Open, Open→Closed, Closed→Finalized

2. **Opening Proposals**:
   - MUST call `ValidateCanOpen()` - requires 2+ options
   - MUST capture `EligibleVotingPowerSnapshot` when transitioning to Open
   - Use `VotingPowerCalculator.CalculateTotalEligibleVotingPower()` with all org balances

3. **Closing Proposals**:
   - MUST call `ValidateCanClose()`
   - MUST call `ComputeResults()` to populate result fields:
     - `WinningOptionId`
     - `QuorumMet`
     - `TotalVotesCast`
     - `ClosedAt`
   - DO NOT manually compute these values; use the domain service

4. **Voting**:
   - MUST call `ValidateCanVote()` before accepting a vote
   - Checks: proposal status, time window, duplicate votes
   - Use `VotingPowerCalculator.CalculateVotingPower()` to get user's voting power
   - Store the calculated voting power in `Vote.VotingPower`

5. **Option Management**:
   - MUST call `ValidateCanAddOption()` before adding options
   - MUST call `ValidateCanDeleteOption()` before deleting options
   - Options can only be deleted in Draft status with no votes

6. **Updates**:
   - MUST call `ValidateCanUpdate()` before updating proposal metadata
   - Only Draft and Open proposals can be updated

**Usage Pattern:**

```csharp
// In ProposalService or similar infrastructure service

// ✅ CORRECT: Validate then transition
var governanceService = new ProposalGovernanceService();
var validation = governanceService.ValidateCanOpen(proposal);
if (!validation.IsValid)
{
    throw new InvalidOperationException(validation.ErrorMessage);
}

// Capture snapshot
var votingPowerCalc = new VotingPowerCalculator();
var allBalances = await GetAllShareBalancesForOrg(proposal.OrganizationId);
proposal.EligibleVotingPowerSnapshot = votingPowerCalc.CalculateTotalEligibleVotingPower(allBalances);

// Transition
proposal.Status = ProposalStatus.Open;
await dbContext.SaveChangesAsync();

// ❌ WRONG: Direct status change without validation
proposal.Status = ProposalStatus.Open;
await dbContext.SaveChangesAsync();
```

**When Closing:**

```csharp
// ✅ CORRECT: Validate, compute results, then close
var validation = governanceService.ValidateCanClose(proposal);
if (!validation.IsValid)
{
    throw new InvalidOperationException(validation.ErrorMessage);
}

var results = governanceService.ComputeResults(proposal);
proposal.Status = ProposalStatus.Closed;
proposal.WinningOptionId = results.WinningOptionId;
proposal.QuorumMet = results.QuorumMet;
proposal.TotalVotesCast = results.TotalVotingPowerCast;
proposal.ClosedAt = DateTimeOffset.UtcNow;
await dbContext.SaveChangesAsync();

// ❌ WRONG: Manual result computation
proposal.Status = ProposalStatus.Closed;
proposal.WinningOptionId = /* some manual logic */;
```

### VotingPowerCalculator

**File**: `backend/FanEngagement.Domain/Services/VotingPowerCalculator.cs`

This service calculates voting power from share balances.

**Formula**: `VotingPower = Sum(Balance × VotingWeight)` across all share types

**Usage:**

```csharp
var calculator = new VotingPowerCalculator();

// Calculate user's voting power
var userBalances = await dbContext.ShareBalances
    .Include(b => b.ShareType)
    .Where(b => b.UserId == userId && b.ShareType!.OrganizationId == orgId)
    .ToListAsync();
var votingPower = calculator.CalculateVotingPower(userBalances);

// Check eligibility
if (!calculator.IsEligibleToVote(votingPower))
{
    throw new InvalidOperationException("User has no voting power in this organization.");
}
```

**ALWAYS use this service for voting power calculation. DO NOT inline the formula elsewhere.**

### Testing Domain Services

Domain service tests go in `backend/FanEngagement.Tests/`:
- `ProposalGovernanceServiceTests.cs` - 32 tests covering all validation and computation logic
- `VotingPowerCalculatorTests.cs` - 10 tests covering all calculation scenarios

**When adding new governance rules:**
1. Add the rule to `ProposalGovernanceService`
2. Write unit tests for the new rule
3. Update `docs/architecture.md` "Proposal Governance Rules" section
4. Update this guide with any new usage patterns

### Integration with Infrastructure Services

Infrastructure services (e.g., `ProposalService` in `FanEngagement.Infrastructure`) should:

1. **Load data** from database (entities with navigation properties)
2. **Instantiate domain services** (they are stateless, can be created on demand)
3. **Call domain service methods** for business logic validation/computation
4. **Handle persistence** of results back to the database

```csharp
public async Task<ProposalDto?> OpenAsync(Guid proposalId, CancellationToken cancellationToken)
{
    var proposal = await dbContext.Proposals
        .Include(p => p.Options)
        .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);
    
    if (proposal is null) return null;

    // Use domain service for validation
    var governanceService = new ProposalGovernanceService();
    var validation = governanceService.ValidateCanOpen(proposal);
    if (!validation.IsValid)
    {
        throw new InvalidOperationException(validation.ErrorMessage);
    }

    // Capture voting power snapshot
    var votingPowerCalc = new VotingPowerCalculator();
    var allBalances = await dbContext.ShareBalances
        .Include(b => b.ShareType)
        .Where(b => b.ShareType!.OrganizationId == proposal.OrganizationId)
        .ToListAsync(cancellationToken);
    proposal.EligibleVotingPowerSnapshot = votingPowerCalc.CalculateTotalEligibleVotingPower(allBalances);

    // Transition
    proposal.Status = ProposalStatus.Open;
    await dbContext.SaveChangesAsync(cancellationToken);

    return MapToDto(proposal);
}
```

**DO NOT skip domain service validation** - it ensures consistency across all entry points (API, background jobs, etc.).

## Recent Architectural Additions

### Proposal Lifecycle Management and Quorum Enforcement (Implemented)

**Background Service:**
- Added `ProposalLifecycleBackgroundService` for automatic proposal transitions
- Polls database at configurable interval (default: 60 seconds)
- Opens Draft proposals when `StartAt <= now`
- Closes Open proposals when `EndAt <= now`
- Configuration in `appsettings.json`:
  ```json
  {
    "ProposalLifecycle": {
      "PollingIntervalSeconds": 60,
      "MaxProposalsPerBatch": 100
    }
  }
  ```

**Lifecycle Changes:**
- Proposals now start in `Draft` status (previously started as `Open`)
- Explicit lifecycle: Draft → Open → Closed → Finalized
- Opening proposal requires 2+ options and captures `EligibleVotingPowerSnapshot`
- Closing proposal computes results using `ProposalGovernanceService.ComputeResults()`
- Results include: `WinningOptionId`, `QuorumMet`, `TotalVotesCast`, `ClosedAt`

**API Endpoints:**
- `POST /proposals/{proposalId}/open` - Manually open proposal
- `POST /proposals/{proposalId}/close` - Manually close proposal
- `POST /proposals/{proposalId}/finalize` - Finalize proposal (terminal state)

**Voting Eligibility:**
- Must be in Open status
- Must have voting power > 0
- Respects time window (`StartAt` and `EndAt`)
- One vote per user per proposal
- Enhanced validation using `ProposalGovernanceService.ValidateCanVote()`

**Outbound Events:**
- Enqueues `ProposalOpened`, `ProposalClosed`, `ProposalFinalized` events
- Events include proposal metadata (id, title, status, results)
- Delivered via existing `WebhookDeliveryBackgroundService`

**Testing:**
- 12 new integration tests in `ProposalLifecycleTests.cs`
- Updated existing tests to accommodate Draft → Open flow
- All 217 tests passing

**Important for Future Development:**
- Always use `ProposalGovernanceService` for lifecycle transitions
- Never manually set `proposal.Status` without validation
- Background service disabled in tests via `TestWebApplicationFactory`

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

## Frontend Development Requirements

### Mandatory UX Patterns

All frontend pages and components MUST follow these patterns:

1. **Loading States**: Use `LoadingSpinner` component for all async loading
   ```typescript
   import { LoadingSpinner } from '../components/LoadingSpinner';
   if (isLoading) return <LoadingSpinner message="Loading..." />;
   ```

2. **Error Handling**: Use `ErrorMessage` component with retry capability
   ```typescript
   import { ErrorMessage } from '../components/ErrorMessage';
   if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
   ```

3. **Empty States**: Use `EmptyState` component when no data
   ```typescript
   import { EmptyState } from '../components/EmptyState';
   {items.length === 0 ? <EmptyState message="No items found." /> : renderItems()}
   ```

4. **User Notifications**: Use notification system for all success/error feedback
   ```typescript
   import { useNotifications } from '../contexts/NotificationContext';
   const { showSuccess, showError } = useNotifications();
   
   // After successful operation
   showSuccess('Item created successfully!');
   
   // On error
   showError('Failed to save item.');
   ```

5. **Error Parsing**: Always use `parseApiError` for API errors
   ```typescript
   import { parseApiError } from '../utils/errorUtils';
   
   try {
     await api.doSomething();
     showSuccess('Success!');
   } catch (err) {
     const errorMessage = parseApiError(err);
     setError(errorMessage);
     showError(errorMessage);
   }
   ```

6. **Button States**: Disable buttons and show progress during async operations
   ```typescript
   <button
     disabled={isSaving}
     style={{ cursor: isSaving ? 'not-allowed' : 'pointer' }}
   >
     {isSaving ? 'Saving...' : 'Save'}
   </button>
   ```

### Testing Requirements

Frontend tests MUST verify:

1. Loading indicators appear and disappear correctly
2. Error messages display when operations fail
3. Success notifications appear after successful operations
4. Buttons are disabled during operations
5. Retry functionality works for error states

### New Page Checklist

When creating a new page:

- [ ] Import and use `LoadingSpinner` for initial load
- [ ] Import and use `ErrorMessage` with retry for errors
- [ ] Import and use `EmptyState` for no-data scenarios
- [ ] Import and use `useNotifications` for user feedback
- [ ] Import and use `parseApiError` for error handling
- [ ] Disable action buttons during async operations
- [ ] Add tests for loading, error, and success states

### Files and Imports

Core UX utilities are located in:
- `frontend/src/contexts/NotificationContext.tsx` - Notification provider and hook
- `frontend/src/components/LoadingSpinner.tsx` - Loading indicator
- `frontend/src/components/ErrorMessage.tsx` - Error display with retry
- `frontend/src/components/EmptyState.tsx` - Empty state display
- `frontend/src/utils/errorUtils.ts` - Error parsing utilities
- `frontend/src/hooks/useAsync.ts` - Async state management hook

## Pagination and Filtering Requirements

When creating or modifying list endpoints and pages, follow the standard pagination and filtering pattern:

### Backend Requirements

**For all new list endpoints:**
- [ ] Add pagination support with query parameters: `page`, `pageSize`
- [ ] Return `PagedResult<T>` from `FanEngagement.Application.Common`
- [ ] Validate pagination parameters:
  - `page` >= 1 (default: 1)
  - `pageSize` between 1 and 100 (default: 10)
  - Use constants from `PaginationValidators`
- [ ] Add appropriate filter parameters based on entity type:
  - Users: `search` (email/name)
  - Organizations: `search` (name)
  - Proposals: `status`, `search` (title)
- [ ] Maintain backward compatibility: if no pagination params, return all items
- [ ] Add integration tests for:
  - Pagination (page boundaries, counts)
  - Filters (search, status, etc.)
  - Parameter validation (invalid page/pageSize)
  - Backward compatibility (no params)

**Example controller pattern:**
```csharp
[HttpGet]
public async Task<ActionResult> GetAll(
    [FromQuery] int? page,
    [FromQuery] int? pageSize,
    [FromQuery] string? search,
    CancellationToken cancellationToken)
{
    if (page.HasValue || pageSize.HasValue || !string.IsNullOrWhiteSpace(search))
    {
        var currentPage = page ?? PaginationValidators.DefaultPage;
        var currentPageSize = pageSize ?? PaginationValidators.DefaultPageSize;
        
        var validationError = PaginationHelper.ValidatePaginationParameters(currentPage, currentPageSize);
        if (validationError != null)
        {
            return validationError;
        }
        
        var pagedResult = await service.GetAllAsync(currentPage, currentPageSize, search, cancellationToken);
        return Ok(pagedResult);
    }
    
    var items = await service.GetAllAsync(cancellationToken);
    return Ok(items);
}
```

### Frontend Requirements

**For all new list pages:**
- [ ] Add `PagedResult<T>` type import from `../types/api`
- [ ] Create paginated API method (e.g., `getAllPaged()`) in API client
- [ ] Track pagination state: `currentPage`, `searchQuery`, filters
- [ ] Use `Pagination` component from `../components/Pagination`
- [ ] Use `SearchInput` component (with debounce) from `../components/SearchInput`
- [ ] Display item count indicators (e.g., "Showing 1-10 of 50 items")
- [ ] Reset to page 1 when changing filters
- [ ] Handle empty results with appropriate message
- [ ] Scroll to top on page change
- [ ] Add tests for:
  - Pagination controls update displayed data
  - Search/filter inputs trigger filtered data
  - Empty results are handled correctly

**Example page pattern:**
```typescript
const [pagedResult, setPagedResult] = useState<PagedResult<Item> | null>(null);
const [currentPage, setCurrentPage] = useState(1);
const [searchQuery, setSearchQuery] = useState('');
const pageSize = 10;

useEffect(() => {
  const fetchData = async () => {
    const data = await itemsApi.getAllPaged(currentPage, pageSize, searchQuery || undefined);
    setPagedResult(data);
  };
  fetchData();
}, [currentPage, searchQuery]);

const handlePageChange = (page: number) => {
  setCurrentPage(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleSearchChange = (value: string) => {
  setSearchQuery(value);
  setCurrentPage(1); // Reset to first page
};
```

**Components to use:**
- `Pagination`: Page navigation controls
- `SearchInput`: Debounced search input (300ms)
- Located in `frontend/src/components/`

**API client pattern:**
```typescript
getAllPaged: async (page: number, pageSize: number, filters?: string): Promise<PagedResult<T>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (filters) {
    params.append('filterName', filters);
  }
  const response = await apiClient.get<PagedResult<T>>(`/endpoint?${params.toString()}`);
  return response.data;
}
```



## Observability Requirements

All new backend features and modifications MUST include appropriate observability instrumentation.

### Structured Logging Requirements

**When to add structured logging:**
- Lifecycle transitions (proposals, votes, webhooks, etc.)
- Critical operations (authentication, authorization, payment, etc.)
- Background service operations (batch processing, scheduled tasks)
- External API calls (webhooks, third-party services)
- Error conditions (validation failures, exceptions)

**Structured logging guidelines:**

1. **Always use structured properties, never string interpolation:**
   ```csharp
   // ✅ CORRECT
   logger.LogInformation(
       "Proposal transition: {ProposalId} (OrgId: {OrganizationId}) from {OldStatus} to {NewStatus}",
       proposalId, organizationId, oldStatus, newStatus);
   
   // ❌ WRONG
   logger.LogInformation($"Proposal {proposalId} transitioned from {oldStatus} to {newStatus}");
   ```

2. **Include relevant context:**
   - Entity IDs (ProposalId, OrganizationId, UserId, etc.)
   - Old and new states for transitions
   - Quantitative data (counts, amounts, voting power)
   - Error details (validation messages, exception types)

3. **Minimize PII in logs:**
   - Log IDs, not names or email addresses
   - For user operations: log user ID only when necessary
   - For votes: log proposal and organization IDs, not user ID

4. **Use appropriate log levels:**
   - `LogInformation` - Successful operations, state transitions
   - `LogWarning` - Validation failures, retryable errors, degraded operations
   - `LogError` - Exceptions, unrecoverable errors, critical failures
   - `LogDebug` - Detailed diagnostic information (development only)

5. **Correlation ID is automatic:**
   - `CorrelationIdMiddleware` adds it to all request-scoped logs
   - No need to manually add CorrelationId to log statements

### Metrics Requirements

**When to add metrics:**
- **Counters** for significant business events:
  - Entity created/updated/deleted (proposals, votes, etc.)
  - API calls and requests
  - Errors and exceptions
  - External service calls
- **Observable gauges** for current state:
  - Queue depths (pending events, background jobs)
  - Active entities by status
  - Resource utilization

**How to add metrics:**

1. **Inject `FanEngagementMetrics` into service:**
   ```csharp
   public class MyService(
       FanEngagementDbContext dbContext,
       FanEngagementMetrics metrics,
       ILogger<MyService> logger) : IMyService
   {
       // Service implementation
   }
   ```

2. **Record metrics after successful operations:**
   ```csharp
   await dbContext.SaveChangesAsync(cancellationToken);
   
   // Record metric
   metrics.RecordProposalTransition(
       oldStatus.ToString(), 
       newStatus.ToString(), 
       proposal.OrganizationId);
   ```

3. **For new metric types, extend `FanEngagementMetrics`:**
   ```csharp
   // Add counter in constructor
   _myOperationCounter = _meter.CreateCounter<long>(
       "my_operation_total",
       description: "Total number of my operations");
   
   // Add public method
   public void RecordMyOperation(bool success, string operationType, Guid orgId)
   {
       _myOperationCounter.Add(1,
           new KeyValuePair<string, object?>("success", success),
           new KeyValuePair<string, object?>("operation_type", operationType),
           new KeyValuePair<string, object?>("organization_id", orgId.ToString()));
   }
   ```

4. **Metric naming conventions:**
   - Use `snake_case` (e.g., `webhook_deliveries_total`)
   - End counters with `_total`
   - Use descriptive tags: `success`, `event_type`, `organization_id`, `status`

### Health Check Requirements

**When to add health checks:**
- New external dependencies (databases, APIs, message queues)
- Critical background services
- Third-party integrations

**How to add health checks:**

1. **Create health check class:**
   ```csharp
   public class MyServiceHealthCheck : IHealthCheck
   {
       public async Task<HealthCheckResult> CheckHealthAsync(
           HealthCheckContext context,
           CancellationToken cancellationToken = default)
       {
           try
           {
               // Perform health check operation
               var isHealthy = await CheckServiceAsync(cancellationToken);
               
               return isHealthy
                   ? HealthCheckResult.Healthy("Service is responsive")
                   : HealthCheckResult.Degraded("Service is slow");
           }
           catch (Exception ex)
           {
               return HealthCheckResult.Unhealthy("Service is unavailable", ex);
           }
       }
   }
   ```

2. **Register in `DependencyInjection.cs`:**
   ```csharp
   services.AddHealthChecks()
       .AddCheck<MyServiceHealthCheck>(
           "my_service",
           failureStatus: HealthStatus.Degraded,  // or Unhealthy
           tags: new[] { "ready" });  // Include in readiness check
   ```

3. **Test in test environment:**
   - Health checks must work with in-memory database
   - Remove or adjust checks in `TestWebApplicationFactory` if needed

### Background Services Observability

**Requirements for all background services:**
1. **Structured logging:**
   - Log service start/stop
   - Log batch operation start with count
   - Log each operation result with entity IDs
   - Log errors with context (entity ID, operation, error details)

2. **Metrics:**
   - Counter for total operations processed
   - Counter for successes and failures
   - Observable gauge for queue depth (if applicable)

3. **Health check:**
   - Add to `BackgroundServicesHealthCheck` if critical for readiness
   - Service must be registered in DI container

**Example pattern:**
```csharp
public class MyBackgroundService(
    IServiceProvider serviceProvider,
    ILogger<MyBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("MyBackgroundService started");
        
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessBatchAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing batch");
            }
            
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
        
        logger.LogInformation("MyBackgroundService stopped");
    }
    
    private async Task ProcessBatchAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var metrics = scope.ServiceProvider.GetService<FanEngagementMetrics>();
        
        var items = await dbContext.MyEntities
            .Where(e => e.Status == Status.Pending)
            .Take(100)
            .ToListAsync(cancellationToken);
        
        logger.LogInformation("Processing {Count} items", items.Count);
        
        foreach (var item in items)
        {
            try
            {
                await ProcessItemAsync(item, cancellationToken);
                logger.LogInformation(
                    "Processed item {ItemId} (OrgId: {OrganizationId})",
                    item.Id, item.OrganizationId);
                metrics?.RecordMyOperation(true, "process", item.OrganizationId);
            }
            catch (Exception ex)
            {
                logger.LogError(
                    ex,
                    "Error processing item {ItemId} (OrgId: {OrganizationId})",
                    item.Id, item.OrganizationId);
                metrics?.RecordMyOperation(false, "process", item.OrganizationId);
            }
        }
    }
}
```

### Pre-Completion Checklist

Before completing any task that modifies backend services or adds new features:

- [ ] Added structured logging to key operations with appropriate context
- [ ] Added metrics for significant events (if applicable)
- [ ] Verified correlation ID is available in request scope
- [ ] Minimized PII in log statements
- [ ] Used appropriate log levels (Info/Warning/Error)
- [ ] Added health check for new external dependencies (if applicable)
- [ ] Tested that logging doesn't break tests
- [ ] Documented metrics in code comments

See `docs/architecture.md` → **Observability & Health** section for complete details.

### Background Process & Outbound Integration Visibility

**IMPORTANT:** When introducing new background processes or outbound integrations, ALWAYS provide similar visibility and retry mechanisms as the webhook delivery system.

**Required for all new background processes:**

1. **Status Tracking Entity:**
   - Create entity to track processing status (e.g., `Pending`, `Processing`, `Completed`, `Failed`)
   - Include `AttemptCount` for retry tracking
   - Include `LastAttemptAt` timestamp
   - Include `LastError` field (max 1000 chars) to capture failure reasons

2. **Admin Observability API:**
   - `GET` endpoint to list items with filters (status, type, date range)
   - `GET` endpoint to retrieve single item details (including full error message and payload summary)
   - `POST` endpoint to retry failed items (if applicable)
   - Protect endpoints with appropriate authorization (OrgAdmin policy for org-scoped items)

3. **Admin UI:**
   - Create admin page to list items with status badges
   - Support filtering by status and other relevant fields
   - Show truncated errors in table, full errors in detail modal
   - Provide retry button for failed items (admin only)
   - Use consistent patterns with existing admin pages

4. **Error Capture:**
   - Capture meaningful error messages when operations fail
   - Include HTTP status codes for external calls
   - Include timeout information
   - Truncate errors to fit database column constraints
   - Clear error on successful retry

5. **Retry Logic:**
   - Implement max retry count (3 is standard)
   - Clear `LastError` when retrying
   - Reset status to `Pending` for manual retries
   - Log retry attempts with context

**Reference Implementation:** The webhook delivery system serves as the reference implementation:
- Entity: `OutboundEvent` with `Status`, `AttemptCount`, `LastAttemptAt`, `LastError`
- Background service: `WebhookDeliveryBackgroundService`
- API: `OutboundEventsController` with list/detail/retry endpoints
- Frontend: `AdminWebhookEventsPage` with filters, detail modal, retry button

## Backend Testing Requirements

When implementing backend features affecting critical flows, you MUST add/extend tests following these patterns.

### Critical Flows Requiring Tests

The following flows are critical and require comprehensive testing:

1. **Proposal Lifecycle Transitions**
   - Draft → Open → Closed → Finalized state machine
   - Validation of required options before opening
   - Capture of voting power snapshot on open
   - Computation of results on close

2. **Voting and Eligibility**
   - Single-vote per user enforcement
   - Voting power calculation from share balances
   - Time window enforcement (StartAt/EndAt)
   - Quorum calculation and verification

3. **Multi-Tenancy**
   - Organization-scoped resource access
   - Cross-org access prevention
   - GlobalAdmin override behavior

4. **Authorization**
   - GlobalAdmin, OrgAdmin, OrgMember, ProposalManager policies
   - Self-access for users viewing their own data
   - Proposal creator permissions

5. **Outbound Events**
   - Event enqueue on lifecycle transitions
   - Correct event type and payload metadata
   - Organization ID in event data

### Test File Organization

| Flow | Test Location |
|------|---------------|
| Proposal lifecycle domain logic | `ProposalGovernanceServiceTests.cs`, `ProposalGovernanceEdgeCaseTests.cs` |
| Voting power calculation | `VotingPowerCalculatorTests.cs` |
| End-to-end proposal workflows | `EndToEndProposalWorkflowTests.cs` |
| Multi-tenancy | `MultiTenancyTests.cs` |
| Authorization | `AuthorizationIntegrationTests.cs` |
| Outbound events | `OutboundEventEnqueueTests.cs` |

### Mandatory Testing Checklist

Before completing a PR that modifies critical flows:

- [ ] Added domain-level tests for new/modified business logic
- [ ] Added integration tests for new/modified API endpoints
- [ ] Verified existing tests still pass
- [ ] Tested authorization for different user roles
- [ ] Tested multi-tenancy if feature is org-scoped
- [ ] Tested outbound event enqueue if feature triggers lifecycle transitions
- [ ] All tests pass: `dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release`

### Test Patterns to Follow

**Domain service tests:**
```csharp
[Fact]
public void ValidateStatusTransition_DraftToOpen_IsValid()
{
    var proposal = CreateDraftProposalWithOptions();
    var result = _service.ValidateStatusTransition(proposal, ProposalStatus.Open);
    Assert.True(result.IsValid);
}
```

**Integration tests:**
```csharp
[Fact]
public async Task CompleteWorkflow_AllStepsSucceed()
{
    // Setup: org, users, shares
    // Act: create proposal → add options → open → vote → close → finalize
    // Assert: each step succeeds, final state is Finalized
}
```

**Multi-tenancy tests:**
```csharp
[Fact]
public async Task UserInOrgA_CannotAccessResourceInOrgB()
{
    // Create two separate orgs
    // Create user in OrgA only
    // Try to access resource in OrgB
    Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
}
```

**Outbound event tests:**
```csharp
[Fact]
public async Task OpeningProposal_EnqueuesProposalOpenedEvent()
{
    // Open proposal via API
    // Check database for OutboundEvent with EventType == "ProposalOpened"
    Assert.NotNull(outboundEvent);
    Assert.Equal(orgId, outboundEvent.OrganizationId);
}
```

See `docs/architecture.md` → **Testing Strategy** section for complete details.
