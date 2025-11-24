# GitHub Copilot Chat Instructions — FanEngagement

This file provides context and guidelines for GitHub Copilot Chat when assisting with the FanEngagement application in VS Code.

## Guardrails for Chat Interactions
- When I request changes, always propose a plan before modifying existing files.
- Never delete code unless explicitly instructed.
- Never introduce new external dependencies without justification.

## Project Overview

FanEngagement is a .NET 9 ASP.NET Core Web API with a PostgreSQL database and a React + TypeScript frontend, designed for fan engagement and organization management with share-based voting capabilities.

### Architecture

- **API Layer** (`backend/FanEngagement.Api`): ASP.NET Core controllers, HTTP endpoints, OpenAPI
- **Application Layer** (`backend/FanEngagement.Application`): Service interfaces, DTOs, request/response models
- **Domain Layer** (`backend/FanEngagement.Domain`): Entities, enums, business logic primitives
- **Infrastructure Layer** (`backend/FanEngagement.Infrastructure`): EF Core DbContext, migrations, service implementations
- **Frontend** (`frontend/`): React 19 + TypeScript app (Vite dev, Nginx in production)
- **Tests** (`backend/FanEngagement.Tests`, `frontend/`): xUnit for backend; Vitest + Testing Library for frontend

### Tech Stack

- Runtime: .NET 9 (`net9.0`) backend; Node 20 for frontend build
- Database: PostgreSQL 16 via EF Core with Npgsql
- Testing: xUnit with integration tests (backend), Vitest + Testing Library (frontend)
- Container orchestration: Docker Compose
- API Documentation: OpenAPI (Development mode)

### Database

- Provider: PostgreSQL 16
- ORM: Entity Framework Core with Npgsql
- Migrations: Located in `backend/FanEngagement.Infrastructure/Persistence/Migrations`
- Auto-apply: Migrations run automatically on API startup
- Connection string: Configured via `appsettings.json` or environment variable `ConnectionStrings__DefaultConnection`

### Frontend

- Framework: React 19 + TypeScript
- Build tool: Vite 7
- Router: React Router v7
- API client: Axios with JWT via `Authorization: Bearer <token>`
- Auth: `AuthContext` persists token/user in `localStorage`; login via `POST /auth/login`
- Env: `VITE_API_BASE_URL` controls API base URL. Default is `/api` (same-origin). For bare dotnet development with Vite dev server, the proxy automatically forwards `/api` requests to `http://localhost:5049`. To bypass the proxy, set `VITE_API_BASE_URL=http://localhost:5049`. With Docker Compose, use `/api` (same-origin).

### Security & JWT Configuration

- The API requires `Jwt:Issuer`, `Jwt:Audience`, and a non-empty `Jwt:SigningKey`.
- In development (bare dotnet) `appsettings.Development.json` provides a sample key; replace before production.
- For Docker Compose, set environment variables (`Jwt__Issuer`, `Jwt__Audience`, `Jwt__SigningKey`). A placeholder is included; override with a strong secret via `.env` or CI secret store:
    - Example `.env` entry: `JWT_SIGNING_KEY=$(openssl rand -base64 64)`
- Never commit production secrets. Rotate keys periodically.
 - Startup will throw if Issuer, Audience, or SigningKey are missing/empty (validated in `Program.cs`).
 - In Development an initial admin user (`admin@example.com`) is auto-created or elevated to Admin role; change this in real environments.
 - CORS defaults to allowing `http://localhost:3000` and `http://localhost:5173` when `Cors:AllowedOrigins` is not configured.

### Authorization & Access Control

FanEngagement uses a comprehensive authorization system based on policies and custom authorization handlers.

#### Authorization Policies

Four main policies are defined and enforced across API endpoints:

1. **GlobalAdmin** - Requires `UserRole.Admin`
   - Platform-wide administrator access
   - Bypasses all organization-level access controls
   - Use for platform management operations

2. **OrgMember** - Requires organization membership (or GlobalAdmin)
   - User must be a member of the organization specified in the route
   - Automatically succeeds for GlobalAdmins
   - Use for read operations within an organization

3. **OrgAdmin** - Requires `OrganizationRole.OrgAdmin` for the organization (or GlobalAdmin)
   - User must be an OrgAdmin of the specific organization in the route
   - Automatically succeeds for GlobalAdmins
   - Use for organization management operations

4. **ProposalManager** - Requires proposal creator, OrgAdmin, or GlobalAdmin
   - Allows proposal creator, OrgAdmins of the org, or GlobalAdmins
   - Use for proposal modification operations

#### Applying Authorization to New Endpoints

When adding a new controller endpoint:

1. **Determine the appropriate policy:**
   - User management → `GlobalAdmin`
   - Organization management → `OrgAdmin` for writes, `OrgMember` for reads
   - Proposal management → `ProposalManager` for writes, `OrgMember` for reads/votes
   - Public endpoints → `[AllowAnonymous]` or no `[Authorize]`

2. **Apply the policy attribute:**
   ```csharp
   [HttpPost]
   [Authorize(Policy = "OrgAdmin")]
   public async Task<ActionResult> Create(...)
   ```

3. **Ensure route parameters match policy expectations:**
   - `OrgMember` and `OrgAdmin` policies expect `organizationId` or `id` in route
   - `ProposalManager` expects `proposalId` in route
   - GlobalAdmin doesn't check route parameters

4. **Test authorization:**
   - Add unit tests for the authorization handler if needed
   - Add integration tests covering authorized and unauthorized access

#### Authorization Handlers

Custom handlers in `backend/FanEngagement.Api/Authorization/`:
- `OrganizationMemberHandler` - Checks membership from `organizationId`/`id` route param
- `OrganizationAdminHandler` - Checks OrgAdmin role from route param
- `ProposalMemberHandler` - Resolves org from `proposalId` and checks membership
- `ProposalManagerHandler` - Checks creator/OrgAdmin/GlobalAdmin for proposals

All handlers first check if the user has GlobalAdmin role, which bypasses org-level checks.

#### Common Patterns

**Organization-scoped controller:**
```csharp
[ApiController]
[Route("organizations/{organizationId:guid}/items")]
[Authorize(Policy = "OrgMember")]  // All actions require membership
public class ItemsController : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = "OrgAdmin")]  // Override for write operation
    public async Task<ActionResult> Create(...) { }
    
    [HttpGet]
    public async Task<ActionResult> GetAll(...) { }  // Inherits OrgMember
}
```

**User management controller:**
```csharp
[HttpGet]
[Authorize(Policy = "GlobalAdmin")]
public async Task<ActionResult> GetAllUsers(...) { }
```

**Self-access endpoints:**
```csharp
[HttpGet("{id:guid}/memberships")]
public async Task<ActionResult> GetUserMemberships(Guid id, ...)
{
    // Check if user is viewing their own memberships or is admin
    if (requestingUserId != id && !User.IsInRole("Admin"))
    {
        return Forbid();
    }
    // ...
}
```

## Development Environment

### Running the Application

**Preferred method (Docker Compose):**
```bash
# Start API + DB + Frontend
docker compose up --build

# API available at http://localhost:8080
# Frontend available at http://localhost:3000
```

**Alternative (bare dotnet):**
```bash
# Requires Postgres running on localhost:5432
dotnet run --project backend/FanEngagement.Api/FanEngagement.Api.csproj --launch-profile http

# API available at http://localhost:5049
```

**Frontend (bare Vite dev server):**
```bash
cd frontend
npm ci
echo "VITE_API_BASE_URL=http://localhost:5049" > .env.development
npm run dev

# Frontend available at http://localhost:5173
```

### Running Tests

**Docker Compose (recommended):**
```bash
docker compose up -d db
docker compose run --rm tests dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release
docker compose down -v
```

**Bare dotnet:**
```bash
dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release
```

**Frontend (Vitest):**
```bash
cd frontend
npm ci
npm test           # or: npm run test:watch
```

### Building

```bash
# Restore dependencies
dotnet restore backend/FanEngagement.sln

# Build solution
dotnet build backend/FanEngagement.sln --configuration Release

# Build frontend
cd frontend
npm ci
npm run build
```

## Code Organization Patterns

### Adding a New Feature

When implementing a new feature or endpoint:

1. **Define the domain entity** (if needed) in `backend/FanEngagement.Domain/Entities/`
2. **Create DTOs/requests** in `backend/FanEngagement.Application/<Feature>/`
3. **Define service interface** in `backend/FanEngagement.Application/<Feature>/I<Feature>Service.cs`
4. **Implement service** in `backend/FanEngagement.Infrastructure/Services/<Feature>Service.cs`
5. **Add controller** in `backend/FanEngagement.Api/Controllers/<Feature>Controller.cs`
6. **Register service** in `backend/FanEngagement.Infrastructure/DependencyInjection.cs`
7. **Configure EF mapping** (if needed) in `backend/FanEngagement.Infrastructure/Persistence/Configurations/`
8. **Add migration** (if schema changes) via `dotnet ef migrations add`
9. **Write tests** in `backend/FanEngagement.Tests/`

### Using Domain Services

Domain services contain pure business logic with no infrastructure dependencies. They live in `backend/FanEngagement.Domain/Services/`.

**When to use domain services:**
- Complex business rule validation
- State transition logic
- Multi-entity computations
- Reusable domain logic that doesn't fit naturally on a single entity

**Current Domain Services:**

#### ProposalGovernanceService

Located in `FanEngagement.Domain.Services`, this service manages proposal lifecycle and governance rules:

```csharp
// Validate status transitions
var validationResult = governanceService.ValidateStatusTransition(proposal, ProposalStatus.Open);
if (!validationResult.IsValid) {
    throw new InvalidOperationException(validationResult.ErrorMessage);
}

// Validate voting eligibility
var canVote = governanceService.ValidateCanVote(proposal, hasExistingVote: false);

// Compute results
var results = governanceService.ComputeResults(proposal);
```

**Rules:**
- Use this service for ALL proposal lifecycle transitions (open, close, finalize)
- Use this service to validate operations (add option, delete option, update, vote)
- Do NOT implement state transition logic directly in controllers or infrastructure services
- The domain service provides consistent validation across the application

**Governance Lifecycle:**
- **Draft → Open**: Requires 2+ options, captures eligible voting power snapshot
- **Open → Closed**: Computes and stores results (winner, quorum, totals)
- **Closed → Finalized**: Marks proposal as permanently complete
- See `docs/architecture.md` "Proposal Governance Rules" section for complete details

#### VotingPowerCalculator

Located in `FanEngagement.Domain.Services`, this service calculates voting power:

```csharp
// Calculate user's voting power
var votingPower = calculator.CalculateVotingPower(userShareBalances);

// Calculate total eligible voting power for org
var totalEligible = calculator.CalculateTotalEligibleVotingPower(allOrgBalances);

// Check eligibility
if (!calculator.IsEligibleToVote(votingPower)) {
    throw new InvalidOperationException("User has no voting power");
}
```

**Usage Guidelines:**
- Always use this service to calculate voting power consistently
- Do NOT inline voting power calculations in multiple places
- Formula: `Sum(Balance × VotingWeight)` across all share types

**Integration Pattern:**

Infrastructure services (e.g., `ProposalService`) should:
1. Load necessary data from database
2. Call domain service methods for business logic
3. Handle persistence of results

```csharp
// ✅ CORRECT: Use domain service
var governanceService = new ProposalGovernanceService();
var validation = governanceService.ValidateCanOpen(proposal);
if (!validation.IsValid) {
    throw new InvalidOperationException(validation.ErrorMessage);
}
// ... proceed with opening

// ❌ WRONG: Ad-hoc validation
if (proposal.Status != ProposalStatus.Draft) {
    throw new InvalidOperationException("Cannot open");
}
```

### Frontend Patterns

- **Routes**: Add to `frontend/src/routes/` and corresponding page components in `frontend/src/pages/`.
- **API clients**: Add/update service modules in `frontend/src/api/` using the shared `apiClient`.
  - Available API clients: `usersApi`, `authApi`, `adminApi`, `membershipsApi`, `organizationsApi`, `shareTypesApi`, `proposalsApi`, `shareBalancesApi`
- **Auth**: Use `AuthContext` and `ProtectedRoute` for protected pages; use `AdminRoute` for admin-only pages.
- **User Self-Service Area**: User routes at `/me` for authenticated users (non-admin). Uses `ProtectedRoute`.
  - User routes:
    - `/me` (account page - view/edit profile)
    - `/me/organizations` (list user's organization memberships)
    - `/me/organizations/:orgId` (view org details, share balances, active proposals)
    - `/me/proposals/:proposalId` (view proposal, cast vote, see results)
- **Admin Area**: Admin routes at `/admin` use a separate `AdminLayout` with sidebar navigation. Only users with Admin role can access.
  - Admin routes: 
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
- **Env**: Ensure `VITE_API_BASE_URL` points to the correct API for your environment.

### Roles & Permissions

FanEngagement defines a **two-tier role model** with comprehensive authorization enforcement on both backend and frontend:

#### Global Roles (User.Role - UserRole enum)
- **User** (`UserRole.User`): Default role for all users. Can manage own profile, view own memberships, participate in organizations they're a member of.
- **Admin** (`UserRole.Admin`): Platform-wide administrator. Can manage all platform resources (users, organizations). Has implicit permission for all actions.

#### Organization Roles (OrganizationMembership.Role - OrganizationRole enum)
- **Member** (`OrganizationRole.Member`): Regular organization member. Can view org details, share balances, proposals, and vote on proposals.
- **OrgAdmin** (`OrganizationRole.OrgAdmin`): Organization administrator. Can manage org settings, memberships, share types, proposals, and webhooks for their organization.

#### Frontend Permission Helpers

The frontend provides a comprehensive permission system via the `usePermissions()` hook:

```typescript
import { usePermissions } from '../hooks/usePermissions';

const { isGlobalAdmin, isOrgAdmin, isOrgMember, memberships } = usePermissions();

// Check permissions
if (isGlobalAdmin()) {
  // Show platform admin features
}

if (isOrgAdmin(orgId)) {
  // Show org admin actions for this organization
}

if (isOrgMember(orgId)) {
  // Show member-level content
}
```

**Permission Wrapper Components:**

Use these for conditional rendering based on roles:

```tsx
import { IfGlobalAdmin, IfOrgAdmin, IfOrgMember } from '../components/PermissionWrappers';

<IfGlobalAdmin>
  <button>Platform Admin Action</button>
</IfGlobalAdmin>

<IfOrgAdmin orgId={orgId}>
  <button>Manage Organization</button>
</IfOrgAdmin>

<IfOrgMember orgId={orgId}>
  <div>Member content</div>
</IfOrgMember>
```

**Route Guards:**

- **`AdminRoute`**: Requires GlobalAdmin role for platform-level admin pages
- **`OrgAdminRoute`**: Requires GlobalAdmin OR OrgAdmin role for org-scoped admin pages
- **`ProtectedRoute`**: Requires authentication (any authenticated user)

```tsx
// routes/index.tsx
{
  path: 'organizations/:orgId/edit',
  element: (
    <OrgAdminRoute>
      <AdminOrganizationEditPage />
    </OrgAdminRoute>
  ),
}
```

#### UI Permission Indicators

- **Platform Admin Badge**: Red "Platform Admin" badge shown in AdminLayout header for GlobalAdmins
- **Org Admin Badge**: Blue "Org Admin" badge shown on organization pages for OrgAdmins
- **Admin Action Links**: OrgAdmins see admin action quick links on MyOrganizationPage
- **Conditional Navigation**: AdminLayout only shows Users/Organizations/Dev Tools nav for GlobalAdmins

#### Backend Authorization

Backend uses policy-based authorization with custom handlers:

**Intended principles (enforced by backend):**
- Global Admin has implicit permission for all actions (bypasses org-level checks)
- Organization-scoped actions require appropriate `OrganizationMembership.Role`
- Users can always access their own resources
- Proposal creators have implicit permission to manage their proposals

For the complete current vs. intended permissions matrix and security gap analysis, see the **Roles & Permissions** section in `docs/architecture.md`.

### Organization Onboarding

FanEngagement provides a streamlined organization creation flow with automatic role assignment.

#### Creating Organizations

**Who Can Create Organizations:**
- Currently restricted to **GlobalAdmin** users only
- Authorization enforced via `[Authorize(Policy = "GlobalAdmin")]` on `POST /organizations` endpoint
- Future: Could be enabled for all authenticated users with approval workflows

**Backend Endpoint:**
```csharp
POST /organizations
{
  "name": "Manchester United Supporters Club",
  "description": "Official fan governance organization"
}
```

**Automatic OrgAdmin Membership:**
- When a GlobalAdmin creates an organization, the system automatically:
  1. Creates the organization record
  2. Creates an `OrganizationMembership` for the creator with `OrganizationRole.OrgAdmin`
  3. Saves both in a single transaction
- The creator immediately has full administrative control over the new organization

**Frontend UI (`/admin/organizations`):**
- "Create Organization" button visible to GlobalAdmin only
- Collapsible create form with Name (required, max 200 chars) and Description (optional, max 1000 chars)
- On success: navigates to `/admin/organizations/{orgId}/edit`
- Uses notification system for success/error feedback

**API Client:**
```typescript
import { organizationsApi } from '../api/organizationsApi';

const newOrg = await organizationsApi.create({
  name: 'My Organization',
  description: 'Organization description'
});
```

**Initial Organization Setup:**
After creating an organization, the creator (now OrgAdmin) should:
1. **Add Members**: Invite other users via `POST /organizations/{orgId}/memberships`
2. **Configure Share Types**: Define share types with voting weights
3. **Issue Shares**: Distribute shares to establish voting power
4. **Create Proposals**: Set up governance proposals for voting
5. **Configure Webhooks** (optional): Set up integrations for notifications

**Security Considerations:**
- Creator user validation occurs before org creation
- Transaction safety ensures consistency (no orphaned orgs/memberships)
- JSON serialization uses `ReferenceHandler.IgnoreCycles` for navigation properties

**Testing:**
- Backend: `OrganizationCreationTests.cs` (6 integration tests)
- Frontend: `AdminOrganizationsPage.test.tsx` (create org tests included)

**See also:** Complete documentation in `docs/architecture.md` → **Organization Onboarding** section

### Organization Branding

Organizations can customize their visual identity with optional branding fields (logo URL and colors). The branding is automatically applied when users interact with organization-scoped pages.

#### Branding Fields

The Organization entity includes three optional branding fields:
- **`logoUrl`** (string): URL to organization's logo image (validated as absolute HTTP/HTTPS URL)
- **`primaryColor`** (string): Primary brand color for headers and buttons (hex, RGB, or CSS color)
- **`secondaryColor`** (string): Secondary brand color for UI elements (hex, RGB, or CSS color)

#### Using Branding in Frontend

**`useOrgBranding` Hook** (`frontend/src/hooks/useOrgBranding.ts`):
```typescript
import { useOrgBranding } from '../hooks/useOrgBranding';

const MyPage = () => {
  const { orgId } = useParams();
  const branding = useOrgBranding(orgId);
  
  // branding.logoUrl - Organization logo URL (or undefined)
  // branding.primaryColor - Primary color (defaults to #0066cc)
  // branding.secondaryColor - Secondary color (defaults to #6c757d)
  // branding.isLoading - Loading state
  // branding.error - Error message if fetch failed
  
  return (
    <div style={{ backgroundColor: branding.primaryColor }}>
      {branding.logoUrl && <img src={branding.logoUrl} alt="Logo" />}
      {/* Your content */}
    </div>
  );
};
```

**Automatic Application:**
- The hook fetches organization data and returns branding with sensible defaults
- Returns default colors (#0066cc primary, #6c757d secondary) if not configured
- Handles loading states and errors gracefully

**Current Usage:**
- `MyOrganizationPage`: Shows branded header with logo and custom colors when configured
- Admin action sections use primary color for accents
- Action buttons use primary color for backgrounds

#### Admin Branding Management

**Admin UI** (`/admin/organizations/:orgId/edit`):
- Branding section with fields for logo URL, primary color, and secondary color
- Color pickers with text input for flexibility
- Live preview of logo when URL is provided
- Color swatches show selected colors

**Creating/Updating Organizations:**
```typescript
import { organizationsApi } from '../api/organizationsApi';

// Include branding fields in create/update requests
await organizationsApi.update(orgId, {
  name: 'Organization Name',
  description: 'Description',
  logoUrl: 'https://cdn.example.com/logo.png',
  primaryColor: '#dc143c',
  secondaryColor: '#ffd700'
});
```

#### Best Practices

- **Logo URLs**: Host logos externally (CDN, public bucket) and provide absolute URLs
- **Color Contrast**: Ensure primary color has good contrast with white text for headers
- **Fallback**: Always design UI to work without branding (defaults should look professional)
- **Testing**: Test with and without branding to ensure graceful degradation

**See also:** Complete documentation in `docs/architecture.md` → **Organization Branding** section

### Organization Context Selection and Switching

FanEngagement supports users belonging to multiple organizations. The frontend provides an active organization context that determines which organization's data is displayed and which organization actions target.

#### Active Organization Context

**`OrgContext` and `useActiveOrganization()` Hook** (`frontend/src/contexts/OrgContext.tsx`):

```typescript
import { useActiveOrganization } from '../contexts/OrgContext';

const MyComponent = () => {
  const { 
    activeOrg,         // Current active organization (id, name, role, branding)
    setActiveOrg,      // Function to switch active org
    memberships,       // All user's organization memberships
    hasMultipleOrgs,   // Boolean: does user belong to >1 org?
    isLoading,         // Boolean: are memberships being loaded?
    refreshMemberships // Function to refresh memberships
  } = useActiveOrganization();

  // Use active org for API calls
  if (activeOrg) {
    const proposals = await proposalsApi.getByOrganization(activeOrg.id);
  }

  return (
    <div>
      <h1>Organization: {activeOrg?.name}</h1>
      <p>Your role: {activeOrg?.role}</p>
    </div>
  );
};
```

**Key Features:**
- **Automatic Selection**: When user logs in, automatically selects:
  - Their only org if they belong to one organization
  - First org if they belong to multiple organizations (if no previous selection stored)
- **Persistence**: Active organization is stored in `localStorage` and restored on page reload
- **Multi-Org Switching**: Users with multiple organizations can switch via `OrganizationSelector` dropdown
- **Synchronization**: When navigating to org-scoped routes with explicit `organizationId`, the context can be synchronized

#### Organization Selector UI

**`OrganizationSelector` Component** (`frontend/src/components/OrganizationSelector.tsx`):

The organization selector dropdown is displayed in the main `Layout` header for authenticated users.

**Behavior:**
- Only shown when `hasMultipleOrgs === true` (user belongs to 2+ organizations)
- Shows all user's organizations with role badges (Admin/Member)
- Selecting an org updates the active context and persists to localStorage
- Displays current role badge next to the dropdown

**Integration:**
```tsx
import { OrganizationSelector } from '../components/OrganizationSelector';

// In Layout.tsx header
<header>
  <nav>
    {isAuthenticated && (
      <>
        <Link to="/me">My Account</Link>
        <OrganizationSelector />  {/* Auto-hidden if single org */}
        <span>Logged in as {user?.email}</span>
      </>
    )}
  </nav>
</header>
```

#### Using Active Organization in Pages

**Pattern 1: Use Active Org for API Calls**
```typescript
const MyOrgPage = () => {
  const { activeOrg } = useActiveOrganization();
  const [data, setData] = useState([]);

  useEffect(() => {
    if (activeOrg) {
      proposalsApi.getByOrganization(activeOrg.id)
        .then(setData);
    }
  }, [activeOrg]);

  return <div>Data for {activeOrg?.name}</div>;
};
```

**Pattern 2: Sync Active Org with Route Param**
```typescript
const MyOrgDetailPage = () => {
  const { orgId } = useParams();
  const { activeOrg, setActiveOrg, memberships } = useActiveOrganization();

  useEffect(() => {
    // Sync active org when navigating to org-scoped route
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

  return <div>Details for organization {orgId}</div>;
};
```

**Pattern 3: Check User's Role in Active Org**
```typescript
const OrgAdminPanel = () => {
  const { activeOrg } = useActiveOrganization();
  const { isOrgAdmin } = usePermissions();

  if (!activeOrg) {
    return <div>Please select an organization</div>;
  }

  if (!isOrgAdmin(activeOrg.id)) {
    return <div>You must be an OrgAdmin to access this page</div>;
  }

  return <div>Admin controls for {activeOrg.name}</div>;
};
```

#### When Building Org-Scoped Features

**Guidelines:**
1. **Always use active org context** when building pages that show/modify org data
2. **Respect explicit route params**: If route includes `organizationId`, use that ID for API calls (and optionally sync active org)
3. **Show org selector** only when `hasMultipleOrgs === true`
4. **Handle no active org**: Check if `activeOrg` is null and show appropriate UI (e.g., "Please select an organization")
5. **Use role from active org**: When checking permissions, use `activeOrg.role` or `isOrgAdmin(activeOrg.id)`

**See also:** Complete documentation in `docs/architecture.md` → **Multi-Organization Membership and Context Selection** section

### Proposal Lifecycle & Governance UX

The frontend provides comprehensive UX for proposal lifecycle, eligibility checking, and results display using reusable components and utility functions.

#### Reusable Components

**ProposalStatusBadge** (`frontend/src/components/ProposalStatusBadge.tsx`)
- Displays colored badge for proposal status
- Usage: `<ProposalStatusBadge status={proposal.status} />`
- Colors: Draft (gray), Open (green), Closed (red), Finalized (blue)

**ProposalTimingInfo** (`frontend/src/components/ProposalTimingInfo.tsx`)
- Shows relative timing messages ("Opens in 2 hours", "Closes in 3 days", "Currently accepting votes")
- Usage: `<ProposalTimingInfo status={proposal.status} startAt={proposal.startAt} endAt={proposal.endAt} />`
- Auto-colors based on status: green for Open, red for Closed

**QuorumInfo** (`frontend/src/components/QuorumInfo.tsx`)
- Displays quorum requirement, eligible voting power, required votes, total votes cast, and quorum met status
- Usage: `<QuorumInfo quorumRequirement={...} quorumMet={...} totalVotesCast={...} eligibleVotingPowerSnapshot={...} />`
- Shows success/error styling based on whether quorum was met

#### Utility Functions (`frontend/src/utils/proposalUtils.ts`)

- **`checkVotingEligibility(status, startAt, endAt, hasVoted, votingPower)`**: Returns `{ eligible: boolean, reason?: string }` with full eligibility check
- **`formatRelativeTime(dateStr)`**: Converts dates to relative format ("in 2 hours", "3 days ago")
- **`getProposalTimingMessage(status, startAt, endAt)`**: Gets contextual timing message based on proposal state
- **`isProposalOpenForVoting(status, startAt, endAt)`**: Boolean check if proposal is currently accepting votes
- **`getStatusBadgeColor(status)`** and **`getStatusLabel(status)`**: Helper functions for status display

#### Page Patterns

**MyProposalPage** (`/me/proposals/:proposalId`) - Member Self-Service
- Fetches proposal, user's share balances (for voting power), existing vote, and results
- Shows eligibility panel with user's voting power and eligibility reason if not eligible
- Displays voting UI (radio buttons + "Cast Vote" button) only when eligible
- Shows results for Open/Closed/Finalized proposals with winning option highlighted
- Uses `checkVotingEligibility()` to determine if voting UI should be shown

**AdminProposalDetailPage** (`/admin/organizations/:orgId/proposals/:proposalId`)
- Shows lifecycle action buttons: "Open Proposal" (Draft), "Close Proposal" (Open), "Finalize" (Closed)
- Displays governance metadata: eligible voting power snapshot, total votes cast, quorum met, closed at, winning option
- Uses `ProposalTimingInfo` for relative timing display
- Uses `QuorumInfo` to show quorum information for Closed/Finalized proposals
- Shows results with winning option highlighted

**AdminOrganizationProposalsPage** (`/admin/organizations/:orgId/proposals`)
- Lists proposals with `ProposalStatusBadge` and `ProposalTimingInfo` components
- Shows quorum met status for Closed/Finalized proposals

#### When Working with Proposals

1. **Always use the reusable components** for consistency across pages
2. **Check eligibility** before showing voting controls - use `checkVotingEligibility()` utility
3. **Show results** for Open/Closed/Finalized proposals (not for Draft)
4. **Display governance fields** from backend: `winningOptionId`, `quorumMet`, `totalVotesCast`, `eligibleVotingPowerSnapshot`, `closedAt`
5. **Handle timing properly**: proposals can have `startAt` (not yet open) and `endAt` (voting closed) constraints
6. **Respect lifecycle** state machine: Draft → Open → Closed → Finalized (no skipping states)
7. **Test with appropriate dates**: use past `startAt` and future `endAt` for testing Open proposals

### Current Entities

- `Organization`: Top-level organization entity with optional branding (LogoUrl, PrimaryColor, SecondaryColor)
- `OrganizationMembership`: User membership in organizations with roles (Member or OrgAdmin)
- `User`: User/member entity with Email, DisplayName, PasswordHash, Role (User or Admin), CreatedAt
- `ShareType`: Type of shares issued by organization
- `ShareBalance`: User's balance of a specific share type
- `ShareIssuance`: Record of share issuance events
- `Proposal`: Governance proposals for voting
- `ProposalOption`: Options within a proposal
- `Vote`: User votes on proposals
- `OutboundEvent`: Event queue for webhooks
- `WebhookEndpoint`: Webhook endpoint configuration

### Current API Endpoints

- Health:
    - `GET /health` → Health check
- Auth & Users:
    - `POST /auth/login` → JWT login
    - `POST /users` → Create user
    - `GET /users` → List users (returns User objects including role field)
    - `GET /users/{id}` → Get user by ID (returns User object including role field)
    - `GET /users/{id}/memberships` → Get user's organization memberships with organization details
    - `PUT /users/{id}` → Update user (accepts optional role field for admins to change user roles)
    - `DELETE /users/{id}` → Delete user
- Organizations & Memberships:
    - `POST /organizations` → Create organization
    - `GET /organizations` → List organizations
    - `GET /organizations/{id}` → Get organization by ID
    - `PUT /organizations/{id}` → Update organization
    - `GET /organizations/{organizationId}/memberships?includeUserDetails=true` → List memberships (optionally with user details)
    - `POST /organizations/{organizationId}/memberships` → Add membership
    - `GET /organizations/{organizationId}/memberships/{userId}` → Get membership by user
    - `DELETE /organizations/{organizationId}/memberships/{userId}` → Remove membership
- Share Types & Issuances:
    - `POST /organizations/{organizationId}/share-types` → Create share type
    - `GET /organizations/{organizationId}/share-types` → List share types
    - `GET /organizations/{organizationId}/share-types/{id}` → Get share type by ID
    - `PUT /organizations/{organizationId}/share-types/{id}` → Update share type
    - `POST /organizations/{organizationId}/share-issuances` → Create share issuance
    - `GET /organizations/{organizationId}/share-issuances` → List share issuances
    - `GET /organizations/{organizationId}/users/{userId}/share-issuances` → List user share issuances
    - `GET /organizations/{organizationId}/users/{userId}/balances` → Get user share balances
- Proposals & Voting:
    - `POST /organizations/{organizationId}/proposals` → Create proposal
    - `GET /organizations/{organizationId}/proposals` → List proposals by organization
    - `GET /proposals/{proposalId}` → Get proposal by ID
    - `PUT /proposals/{proposalId}` → Update proposal
    - `POST /proposals/{proposalId}/open` → Open proposal (transitions Draft → Open, captures voting power snapshot)
    - `POST /proposals/{proposalId}/close` → Close proposal (transitions Open → Closed, computes results)
    - `POST /proposals/{proposalId}/finalize` → Finalize proposal (transitions Closed → Finalized, terminal state)
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

## Coding Conventions

### General Style

- **Controllers**: Thin controllers; delegate business logic to services
- **Async/await**: Use async APIs throughout; pass `CancellationToken` to all async methods
- **Dependency injection**: Constructor injection with primary constructors where appropriate
- **Naming**: PascalCase for types/public members, camelCase for parameters/locals, pluralize collections
- **Return types**: Use `ActionResult<T>` or `ActionResult` for controller actions
- **HTTP status codes**: Return semantically correct codes (`201 Created`, `404 NotFound`, `204 NoContent`, etc.)

### Entity Configuration

- Use Fluent API configuration in separate files under `Persistence/Configurations/`
- Configure relationships, indexes, and constraints explicitly
- Use value converters for enums when needed

### Testing

- Use `WebApplicationFactory<Program>` for integration tests
- Inject `ITestOutputHelper` to log debugging information
- Test both success and error paths
- Keep tests focused and deterministic
- Avoid excessive mocking; prefer integration tests with real database

### Error Handling

- Return appropriate HTTP status codes from controllers
- Log errors appropriately (use `ILogger<T>`)
- Avoid exposing internal details in production error responses

## Database Migrations

### Creating Migrations

```bash
# Install EF tools if needed
dotnet tool install --global dotnet-ef

# Add migration
dotnet ef migrations add <MigrationName> \
  --project backend/FanEngagement.Infrastructure/FanEngagement.Infrastructure.csproj \
  --startup-project backend/FanEngagement.Api/FanEngagement.Api.csproj

# Apply migration locally
dotnet ef database update \
  --project backend/FanEngagement.Infrastructure/FanEngagement.Infrastructure.csproj \
  --startup-project backend/FanEngagement.Api/FanEngagement.Api.csproj
```

### Migration Guidelines

- Include descriptive migration names (e.g., `AddProposalVotingTables`)
- Review generated migration code before committing
- Test migrations both up and down
- Migrations apply automatically on API startup

## Validation & Error Handling

### Request Validation with FluentValidation

The API uses FluentValidation for automatic request validation. All request DTOs have corresponding validators in `backend/FanEngagement.Application/Validators/`.

#### Adding Validation for New DTOs

1. **Create a validator class** in `backend/FanEngagement.Application/Validators/`:

```csharp
using FluentValidation;

namespace FanEngagement.Application.Validators;

public class CreateMyRequestValidator : AbstractValidator<CreateMyRequest>
{
    public CreateMyRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(100).WithMessage("Name must not exceed 100 characters.");
        
        RuleFor(x => x.Email)
            .EmailAddress().WithMessage("Email must be a valid email address.")
            .When(x => !string.IsNullOrEmpty(x.Email));
        
        RuleFor(x => x.Age)
            .GreaterThanOrEqualTo(0).WithMessage("Age must be greater than or equal to 0.")
            .LessThanOrEqualTo(150).WithMessage("Age must not exceed 150.");
    }
}
```

2. **Validators are auto-registered** - No manual registration needed, FluentValidation discovers them automatically

3. **Validation runs automatically** before controller actions execute

#### Common Validation Patterns

- **Required fields**: `.NotEmpty()`
- **String length**: `.MinimumLength(n)`, `.MaximumLength(n)`
- **Numeric ranges**: `.GreaterThan(n)`, `.GreaterThanOrEqualTo(n)`, `.LessThan(n)`, `.LessThanOrEqualTo(n)`
- **Email format**: `.EmailAddress()`
- **Custom validation**: `.Must(x => CustomValidation(x)).WithMessage("...")`
- **Conditional validation**: `.When(x => condition)`
- **Complex validation**: Use `.Custom()` for multi-field validation

### Error Handling

#### Global Exception Middleware

The `GlobalExceptionHandlerMiddleware` catches all unhandled exceptions and returns RFC 7807 ProblemDetails responses:

**Do NOT use try-catch in controllers** - Let exceptions bubble up to the middleware:

```csharp
// ❌ DON'T DO THIS
[HttpPost]
public async Task<ActionResult> Create([FromBody] CreateRequest request)
{
    try
    {
        var result = await _service.CreateAsync(request);
        return Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return BadRequest(new { error = ex.Message });
    }
}

// ✅ DO THIS
[HttpPost]
public async Task<ActionResult> Create([FromBody] CreateRequest request)
{
    var result = await _service.CreateAsync(request);
    return Ok(result);
}
```

#### Exception Types and HTTP Status Codes

- `InvalidOperationException` → 400 Bad Request
- `ArgumentException` → 400 Bad Request
- `DomainValidationException` → 400 Bad Request (custom exception in `FanEngagement.Api.Exceptions`)
- `ResourceNotFoundException` → 404 Not Found (custom exception)
- All other exceptions → 500 Internal Server Error

#### Throwing Domain Validation Errors in Services

For business rule violations, throw `InvalidOperationException`:

```csharp
public async Task<Proposal> UpdateAsync(Guid id, UpdateProposalRequest request)
{
    var proposal = await _context.Proposals.FindAsync(id);
    if (proposal is null)
        return null;
    
    // Domain validation
    if (proposal.Status == ProposalStatus.Closed)
    {
        throw new InvalidOperationException("Cannot update a closed proposal.");
    }
    
    // ... update logic
}
```

#### Standard Error Response Format

All errors follow RFC 7807 ProblemDetails:

**Validation errors** (HTTP 400):
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Email": ["Email must be a valid email address."],
    "Password": ["Password must be at least 8 characters."]
  }
}
```

**Domain errors** (HTTP 400):
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Invalid Operation",
  "status": 400,
  "detail": "Cannot update proposal in Closed state."
}
```

**Resource not found** (HTTP 404):
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Not Found",
  "status": 404,
  "detail": "The requested resource was not found."
}
```

## Pagination and Filtering

FanEngagement provides a consistent pagination and filtering system across all list endpoints.

### Backend Pagination

**Standard pagination parameters:**
- `page` (int, optional, default: 1): Page number (1-based)
- `pageSize` (int, optional, default: 10): Items per page (min: 1, max: 100)

**Response type:** `PagedResult<T>` in `FanEngagement.Application.Common`

**Implementing pagination in controllers:**
- Add optional query parameters: `page`, `pageSize`, and filter params (e.g., `search`, `status`)
- Validate parameters using constants from `PaginationValidators`
- Call paginated service method if any pagination params are provided
- Maintain backward compatibility by returning all items when no params provided

**Standard filters by endpoint:**
- Users: `search` (filters by email or display name)
- Organizations: `search` (filters by organization name)
- Proposals: `status` (Draft/Open/Closed/Finalized), `search` (filters by title)

### Frontend Pagination

**Components:**
- `Pagination`: Renders page navigation controls
- `SearchInput`: Debounced search input (300ms delay)

**API client pattern:**
- Add `getAllPaged()` method alongside existing `getAll()` method
- Use URLSearchParams to build query string
- Return `PagedResult<T>` type

**Page implementation:**
- Track `currentPage`, `searchQuery`, `statusFilter` in state
- Fetch data in `useEffect` when filters/page change
- Reset to page 1 when changing filters
- Display count indicators (e.g., "Showing 1-10 of 50 users")

## Common Tasks

### Adding a New Controller Endpoint

1. Add action method to existing controller or create new controller
2. Use appropriate HTTP verb attribute (`[HttpGet]`, `[HttpPost]`, etc.)
3. Define route with `[Route]` attribute
4. Accept `CancellationToken` as last parameter
5. Call service layer method
6. Return appropriate `ActionResult`

### Adding a New Service Method

1. Add method signature to service interface in `Application/`
2. Implement method in service class in `Infrastructure/Services/`
3. Use dependency-injected `FanEngagementDbContext` for data access
4. Make method async and accept `CancellationToken`
5. Handle not-found cases appropriately (return null or throw)

### Modifying an Entity

1. Update entity class in `Domain/Entities/`
2. Update EF configuration in `Infrastructure/Persistence/Configurations/` if needed
3. Generate migration with `dotnet ef migrations add`
4. Review and test migration
5. Update related DTOs, services, and tests

## Troubleshooting

### Common Issues

- **Port conflicts**: API uses 8080 (Docker) or 5049 (dotnet); ensure ports are free
- **Database connection**: Ensure Postgres is running and connection string is correct
- **Migration errors**: Check `ConnectionStrings__DefaultConnection` and ensure database is accessible
- **Test failures**: Ensure database service is healthy before running tests

### Debugging

- Set breakpoints in controllers or services
- Use `ITestOutputHelper` in tests to log details
- Check Docker logs: `docker compose logs api` or `docker compose logs db`
- Inspect container: `docker exec -it fanengagement-db psql -U fanengagement`
- Frontend dev: run `npm run dev` in `frontend/`, check browser console/network

## CI/CD

- CI runs on push and PR to `main`
- Workflow: `.github/workflows/ci.yml`
- Uses Docker Compose to run tests against Postgres
- Uploads test results as artifacts

Note: Frontend builds as a static site in the `frontend` container (Nginx). Frontend tests run locally (`npm test` in `frontend/`).

## When Suggesting Code

- **Follow existing patterns**: Review similar existing code before suggesting new implementations
- **Include all necessary using statements**: Don't omit namespaces
- **Use primary constructors**: For simple DI scenarios (C# 12 feature)
- **Pass CancellationToken**: All async methods should accept and pass `CancellationToken`
- **Write tests**: Suggest corresponding test code when adding features
- **Consider migrations**: Remind user to create migration if entity schema changes
- **Use appropriate status codes**: REST APIs should return semantically correct HTTP codes
- **Handle nulls**: Use nullable reference types correctly
- **Register services**: Remind user to register new services in `DependencyInjection.cs`

## Example Implementations

### Example Controller Action

```csharp
[HttpGet("{id:guid}")]
public async Task<ActionResult<OrganizationDto>> GetById(Guid id, CancellationToken cancellationToken)
{
    var organization = await _organizationService.GetByIdAsync(id, cancellationToken);
    if (organization is null)
    {
        return NotFound();
    }
    return Ok(organization);
}
```

### Example Service Method

```csharp
public async Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
{
    return await _context.Organizations
        .Include(o => o.Members)
        .FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
}
```

### Example Integration Test

```csharp
[Fact]
public async Task GetOrganizationById_ReturnsOrganization_WhenExists()
{
    // Arrange
    var createResponse = await _client.PostAsJsonAsync("/organizations", 
        new CreateOrganizationRequest("Test Org"));
    var created = await createResponse.Content.ReadFromJsonAsync<OrganizationDto>();

    // Act
    var response = await _client.GetAsync($"/organizations/{created!.Id}");

    // Assert
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    var org = await response.Content.ReadFromJsonAsync<OrganizationDto>();
    Assert.NotNull(org);
    Assert.Equal("Test Org", org!.Name);
}
```

### Proposal Management Pages

The admin proposal management UI follows consistent patterns:

- **List Page** (`AdminOrganizationProposalsPage`):
  - Displays proposals with status badges (Draft/Open/Closed/Finalized)
  - Create new proposals inline with collapsible form
  - Status-specific colors: Draft (gray), Open (green), Closed (red), Finalized (blue)
  - Shows proposal metadata: title, description, start/end dates, quorum requirement
  
- **Detail Page** (`AdminProposalDetailPage`):
  - View proposal details with formatted dates and metadata
  - Edit mode available for Draft/Open proposals
  - Options management: add/delete options (subject to backend validation)
  - Close button for Draft/Open proposals
  - Results display for Closed/Finalized proposals with:
    - Vote counts and voting power per option
    - Percentage bars for visual representation
    - Total voting power across all options
  
- **Form Accessibility**:
  - All form fields use `htmlFor` and `id` attributes for proper label association
  - Enables `getByLabelText` in tests
  - Pattern: `<label htmlFor="fieldName">` + `<input id="fieldName">`

- **State Management**:
  - Auth user ID retrieved from useAuth hook for proposal creation
  - Form state managed in component state with controlled inputs
  - Success/error messages displayed above forms
  - Refetch data after mutations

## Additional Resources

- Solution file: `backend/FanEngagement.sln`
- Docker Compose: `docker-compose.yml`
- Architecture docs: `docs/architecture.md`
- Coding agent guide: `.github/copilot-coding-agent-instructions.md`

---
This instruction file helps GitHub Copilot Chat provide contextually relevant, accurate suggestions for the FanEngagement codebase.

### Frontend UX Patterns

The frontend uses consistent patterns for loading states, error handling, and user notifications:

#### Notification System

All pages should use the notification system for user feedback:

```typescript
import { useNotifications } from '../contexts/NotificationContext';

const { showSuccess, showError, showInfo, showWarning } = useNotifications();

// Show success after successful operations
showSuccess('User updated successfully!');

// Show errors from API failures  
showError('Failed to save. Please try again.');
```

The `NotificationContainer` displays toasts in the top-right corner with auto-dismiss after 5 seconds.

#### Loading States

Use consistent loading indicators:

```typescript
import { LoadingSpinner } from '../components/LoadingSpinner';

if (isLoading) {
  return <LoadingSpinner message="Loading users..." />;
}
```

#### Error Display

Use the `ErrorMessage` component for error states:

```typescript
import { ErrorMessage } from '../components/ErrorMessage';

if (error) {
  return <ErrorMessage message={error} onRetry={fetchData} />;
}
```

#### Empty States

Use `EmptyState` when there's no data:

```typescript
import { EmptyState } from '../components/EmptyState';

{data.length === 0 ? (
  <EmptyState message="No users found." />
) : (
  // render data
)}
```

#### Error Parsing

Use `parseApiError` to extract meaningful error messages from API responses:

```typescript
import { parseApiError } from '../utils/errorUtils';

try {
  await api.doSomething();
} catch (err) {
  const errorMessage = parseApiError(err);
  setError(errorMessage);
  showError(errorMessage);
}
```

This automatically handles:
- RFC 7807 ProblemDetails format (`detail`, `title`)
- Validation errors from the `errors` field
- HTTP status codes (400, 401, 403, 404, 500)
- Network errors

#### Async Operations Hook

For complex async state management, use the `useAsync` hook:

```typescript
import { useAsync } from '../hooks/useAsync';

const { data, loading, error, execute, reset } = useAsync(
  () => usersApi.getAll(),
  true // execute immediately
);

// Manual execution
execute();

// Reset state
reset();
```

#### UI Feedback During Operations

Disable buttons and show progress during async operations:

```typescript
<button
  type="submit"
  disabled={isSaving}
  style={{
    backgroundColor: isSaving ? '#ccc' : '#0066cc',
    cursor: isSaving ? 'not-allowed' : 'pointer',
  }}
>
  {isSaving ? 'Saving...' : 'Save'}
</button>
```

#### Complete Page Pattern

A typical CRUD page should:

1. Use `LoadingSpinner` during initial load
2. Use `ErrorMessage` with retry if load fails
3. Use `EmptyState` when no data
4. Use notifications for success/error feedback
5. Disable action buttons during operations
6. Parse errors with `parseApiError`

Example structure:

```typescript
const MyPage = () => {
  const { showSuccess, showError } = useNotifications();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await api.getData();
      setData(result);
    } catch (err) {
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  return (
    <div>
      {data.length === 0 ? (
        <EmptyState message="No data yet." />
      ) : (
        // render data
      )}
    </div>
  );
};
```

