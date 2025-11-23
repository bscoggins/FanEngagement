# FanEngagement – Backend Architecture

## Goal

FanEngagement is a multi-tenant fan governance platform. Organizations (teams, clubs, etc.) can issue “shares” to users and use them for governance (voting on proposals). The platform manages users, organizations, shares, proposals, votes, and webhooks that notify external systems of outcomes.

## Core Concepts

- **User**
  - Registered participant in the platform.
  - Can belong to one or more organizations.

- **Organization**
  - Team/club/entity.
  - Configures its own governance rules and share types.

- **OrganizationMembership**
  - Links a User to an Organization with a role:
    - `OrgAdmin`, `Member` (extendable).

- **ShareType**
  - Defined per Organization.
  - Fields:
    - `Name`
    - `Symbol`
    - `Description`
    - `VotingWeight` (e.g., 1.0, 10.0)
    - `MaxSupply` (optional)
    - `IsTransferable` (bool)

- **ShareIssuance**
  - Records issuance of a quantity of a ShareType to a User.
  - Used for auditing and history.

- **ShareBalance**
  - Denormalized view of current quantity held by a User for a ShareType.
  - Maintained by the application whenever issuances or transfers occur.

- **Proposal**
  - A question to be voted on within an Organization.
  - References eligible ShareTypes.
  - Fields:
    - `Title`
    - `Description`
    - `Status` (`Draft`, `Open`, `Closed`, `Finalized`)
    - `StartAt`, `EndAt`
    - `QuorumRequirement` (e.g., min % of voting power)
    - `CreatedByUserId`

- **ProposalOption**
  - Possible choices for a Proposal (e.g., "Red kit", "Blue kit").

- **Vote**
  - A User’s vote on a Proposal.
  - Includes `VotingPower` captured from a snapshot of balances at vote time (or at proposal start).

- **WebhookEndpoint**
  - Registered by an Organization.
  - Fields:
    - `Url`
    - `Secret`
    - `SubscribedEvents` (e.g., `ProposalCreated`, `ProposalFinalized`)

- **OutboundEvent**
  - Queued event for delivery to webhook endpoints.
  - Fields:
    - `EventType`
    - `Payload` (JSON)
    - `Status` (`Pending`, `Delivered`, `Failed`)
    - `AttemptCount`
    - `LastAttemptAt`

## Roles & Permissions

FanEngagement defines a two-tier role model: **Global Roles** (platform-wide) and **Organization Roles** (per-organization). The role model is implemented in the domain entities, but **authorization enforcement is currently incomplete** and varies by endpoint.

### Role Definitions

#### Global Roles (User.Role - UserRole enum)

These roles are assigned to users at the platform level and stored in the `User.Role` property.

- **User** (`UserRole.User`, default)
  - Regular platform user with no special privileges
  - Can participate in organizations they are a member of
  - Can manage their own profile and view their memberships
  - Default role for all newly created users

- **Admin** (`UserRole.Admin`)
  - Platform-wide administrator with elevated privileges
  - Can manage all platform resources (users, organizations, etc.)
  - Can perform administrative tasks like seeding dev data
  - Should be granted sparingly and only to trusted platform operators
  > **Security Note:** Global Admins bypass all organization-level access controls and should be granted only to trusted platform operators.

#### Organization Roles (OrganizationMembership.Role - OrganizationRole enum)

These roles are assigned per-organization via the `OrganizationMembership.Role` property. A user's role in one organization does not affect their role in another.

- **Member** (`OrganizationRole.Member`)
  - Regular member of an organization
  - Can view organization details, share balances, and proposals
  - Can vote on proposals within the organization
  - Can view their own share balances and issuances

- **OrgAdmin** (`OrganizationRole.OrgAdmin`)
  - Administrator for a specific organization
  - Can manage organization settings and details
  - Can manage memberships (add/remove members, assign roles for other members; cannot modify their own role to prevent privilege escalation)
  - Can manage share types and issue shares
  - Can create, edit, and manage proposals
  - Can manage webhook endpoints and view outbound events

### Current Authorization Implementation

> **⚠️ IMPORTANT:** The permissions documented below represent the **intended model**, not the current implementation. Many endpoints lack proper authorization checks. See the table below for actual enforcement.

The table below specifies the **intended** permissions model that should be enforced.

| Action | Current Enforcement | Intended: Global User | Intended: Global Admin | Intended: Org Member | Intended: Org OrgAdmin | Implementation Notes |
|--------|---------------------|-------------|---------------|-------------|---------------|----------------------|
| **User Management** |
| Create user | ✅ OPEN | ✓ | ✓ | - | - | `[AllowAnonymous]` - anyone can create |
| List all users | ⚠️ AUTH-ONLY | - | ✓ | - | - | `[Authorize]` only - any authenticated user can list |
| View any user | ⚠️ AUTH-ONLY | - | ✓ | - | - | `[Authorize]` only - any authenticated user can view |
| Update any user | ⚠️ AUTH-ONLY | - | ✓ | - | - | `[Authorize]` only - CRITICAL RISK: any authenticated user can update any user (including role changes for privilege escalation) |
| Delete any user | ⚠️ AUTH-ONLY | - | ✓ | - | - | `[Authorize]` only - any authenticated user can delete |
| View own memberships | ✅ ENFORCED | ✓ | ✓ | - | - | Properly checks self or Admin role |
| View user statistics | ✅ ENFORCED | - | ✓ | - | - | `[Authorize(Roles = "Admin")]` |
| **Organization Management** |
| Create organization | ⚠️ OPEN | - | ✓ | - | - | No `[Authorize]` - anonymous users can create |
| List all organizations | ⚠️ OPEN | ✓ | ✓ | - | - | No `[Authorize]` - anonymous access |
| View organization | ⚠️ OPEN | (member) | ✓ | ✓ | ✓ | No `[Authorize]` - anonymous access |
| Update organization | ⚠️ AUTH-ONLY | - | ✓ | - | ✓ | `[Authorize]` only - any authenticated user can update |
| **Membership Management** |
| Add member to org | ⚠️ AUTH-ONLY | - | ✓ | - | ✓ | `[Authorize]` only - any authenticated user can add |
| List org memberships | ⚠️ AUTH-ONLY | - | ✓ | - | ✓ | `[Authorize]` only - any authenticated user can list |
| View membership | ⚠️ AUTH-ONLY | - | ✓ | - | ✓ | `[Authorize]` only - any authenticated user can view |
| Remove member | ⚠️ AUTH-ONLY | - | ✓ | - | ✓ | `[Authorize]` only - any authenticated user can remove |
| Update membership role | ❌ Not supported | - | ✓ | - | ✓ | No API endpoint exists; roles can only be set during membership creation via `CreateMembershipRequest.Role`. To change a role, delete and recreate the membership. |
| **Share Type Management** |
| Create share type | ⚠️ AUTH-ONLY | - | ✓ | - | ✓ | `[Authorize]` only - any authenticated user |
| List share types | ⚠️ AUTH-ONLY | (member) | ✓ | ✓ | ✓ | `[Authorize]` only - any authenticated user |
| View share type | ⚠️ AUTH-ONLY | (member) | ✓ | ✓ | ✓ | `[Authorize]` only - any authenticated user |
| Update share type | ⚠️ AUTH-ONLY | - | ✓ | - | ✓ | `[Authorize]` only - any authenticated user |
| **Share Issuance & Balances** |
| Issue shares | ⚠️ OPEN | - | ✓ | - | ✓ | No `[Authorize]` - anonymous access |
| List share issuances | ⚠️ OPEN | - | ✓ | - | ✓ | No `[Authorize]` - anonymous access |
| View user share issuances | ⚠️ OPEN | (self) | ✓ | ✓ (self) | ✓ | No `[Authorize]` - anonymous access |
| View user share balances | ⚠️ OPEN | (self) | ✓ | ✓ (self) | ✓ | No `[Authorize]` - anonymous access |
| **Proposal Management** |
| Create proposal | ⚠️ OPEN | (member) | ✓ | ✓ | ✓ | No `[Authorize]` - anonymous access |
| List proposals by org | ⚠️ OPEN | (member) | ✓ | ✓ | ✓ | No `[Authorize]` - anonymous access |
| View proposal | ⚠️ OPEN | (member) | ✓ | ✓ | ✓ | No `[Authorize]` - anonymous access |
| Update proposal | ⚠️ OPEN | (creator) | ✓ | - | ✓ | No `[Authorize]` - anonymous access |
| Close proposal | ⚠️ OPEN | (creator) | ✓ | - | ✓ | No `[Authorize]` - anonymous access |
| Add proposal option | ⚠️ OPEN | (creator) | ✓ | - | ✓ | No `[Authorize]` - anonymous access |
| Delete proposal option | ⚠️ OPEN | (creator) | ✓ | - | ✓ | No `[Authorize]` - anonymous access |
| View proposal results | ⚠️ OPEN | (member) | ✓ | ✓ | ✓ | No `[Authorize]` - anonymous access |
| **Voting** |
| Cast vote | ⚠️ OPEN | (member) | ✓ | ✓ | ✓ | No `[Authorize]` - anonymous access |
| View own vote | ⚠️ OPEN | ✓ | ✓ | ✓ | ✓ | No `[Authorize]` - anonymous access |
| View user's vote | ✅ PARTIAL | - | ✓ | - | - | Checks self or Admin role |
| **Webhook & Events Management** |
| Webhook CRUD | ⚠️ OPEN | - | ✓ | - | ✓ | No `[Authorize]` - anonymous access |
| Outbound events | ⚠️ OPEN | - | ✓ | - | ✓ | No `[Authorize]` - anonymous access |
| **Admin & Dev Tools** |
| Seed dev data | ✅ ENFORCED | - | ✓ | - | - | `[Authorize(Roles = "Admin")]` + environment check |

**Legend:**
- ✅ ENFORCED: Proper authorization checks in place
- ✅ PARTIAL: Some checks but incomplete
- ⚠️ AUTH-ONLY: Only requires authentication, no role/membership checks
- ⚠️ OPEN: No authorization - anonymous access allowed
- ✓ = Should be allowed (intended model)
- - = Should not be allowed
- (member) = Should be allowed if user is a member of the relevant organization
- (self) = Should be allowed only for the user's own resources
- (creator) = Should be allowed if user is the creator of the resource

### Intended Authorization Rules (Target State)

1. **Global Admin Override**: A user with `UserRole.Admin` should have implicit permission for all actions, regardless of organization membership or role.
   > **Security Note:** Global Admins bypass all organization-level access controls and should be granted only to trusted platform operators.

2. **Organization Membership Required**: For any organization-scoped action, the user should have an `OrganizationMembership` record for that organization (unless they are a Global Admin).

3. **Organization Role Check**: For organization-scoped actions, the system should:
   - Extract the `organizationId` from the route or request
   - Query `OrganizationMembership` where `UserId = currentUser.Id AND OrganizationId = organizationId`
   - Check the `Role` property of the membership record
   - Grant or deny access based on the intended permissions above

4. **Self-Access**: Users should be able to access their own resources (profile, memberships, votes, balances) without needing special roles.

5. **Creator Privileges**: Users who create proposals should have permission to manage those proposals (update, close, manage options) even if they are not OrgAdmins, as long as they are members of the organization.

6. **Privilege Escalation Prevention**: OrgAdmins should not be able to modify their own membership role to prevent privilege escalation. Only Global Admins or other OrgAdmins should be able to change an OrgAdmin's role.

### Implementation Gaps & Security Concerns

> **⚠️ CRITICAL SECURITY GAPS:** The current implementation has significant authorization gaps that expose sensitive operations to unauthorized users.

1. **User Management APIs** (UsersController):
   - ❌ List, view, update, delete users require only `[Authorize]` with no role checks
   - ❌ Any authenticated user can view all users, update any user (including role changes), or delete any user
   - ✅ Only "View user statistics" properly requires Admin role
   - **Risk:** User enumeration, unauthorized privilege escalation, account takeover

2. **Organization APIs** (OrganizationsController):
   - ❌ Create, list, view organizations have NO authorization - anonymous access
   - ❌ Update organization requires only `[Authorize]` with no role checks
   - **Risk:** Unauthorized org creation, data exposure, unauthorized modifications

3. **Membership APIs** (MembershipsController):
   - ❌ All membership operations require only `[Authorize]` with no organization role checks
   - ❌ Any authenticated user can add/remove members for any organization
   - ❌ No endpoint exists to update membership roles; roles can only be set at creation, requiring delete/recreate to change
   - **Risk:** Unauthorized access grants, membership manipulation (note: while there's no direct role update endpoint, recreation allows role changes)

4. **Share Type, Issuance, Balances** (ShareTypesController, ShareIssuancesController):
   - ❌ Share type operations require only `[Authorize]` - any authenticated user can create/update
   - ❌ Share issuance and balance endpoints have NO authorization - anonymous access
   - **Risk:** Unauthorized share issuance, balance manipulation, financial fraud

5. **Proposal & Voting APIs** (OrganizationProposalsController, ProposalsController, etc.):
   - ❌ Organization proposal create/list have NO authorization - anonymous access
   - ❌ Proposal view/update/close/options have NO authorization - anonymous access
   - ❌ Voting endpoints have NO authorization - anonymous voting possible
   - **Risk:** Anonymous voting, proposal manipulation, results tampering, governance fraud

6. **Webhook & Event APIs** (WebhookEndpointsController, OutboundEventsController):
   - ❌ All webhook and outbound event operations have NO authorization - anonymous access
   - **Risk:** Unauthorized webhook creation, event manipulation, data exfiltration

### Migration Path to Proper Authorization

To implement the intended model, the following work is required:

1. **Implement Policy-Based Authorization**:
   - Create custom authorization policies for each permission category
   - Define requirements for Global Admin, OrgAdmin, and OrgMember scenarios
   - Implement custom authorization handlers that query OrganizationMembership

2. **Apply Policies to Controllers**:
   - Replace bare `[Authorize]` with specific policy requirements
   - Add organization-scoped policy checks (e.g., `[Authorize(Policy = "RequireOrgAdmin")]`)
   - Implement organization context extraction from routes

3. **Add Privilege Escalation Safeguards**:
   - Prevent OrgAdmins from modifying their own membership role
   - Validate role changes at the service layer

4. **Add Authorization Tests**:
   - Test each endpoint with different role combinations
   - Verify access is properly denied for unauthorized users
   - Test edge cases (self-access, creator privileges, admin override)

### JWT Claims & Implementation

- **JWT Claims**: The JWT token includes role claims for the user's global role via `ClaimTypes.Role`
- **Organization Role Checks**: Organization-specific role checks require database lookups of `OrganizationMembership` records
- **Current Approach**: Mixed use of `[Authorize]`, `[Authorize(Roles = "Admin")]`, and manual `User.IsInRole()` checks
- **Target Approach**: Consistent policy-based authorization with custom requirements and handlers

## Tech Stack

- Runtime: .NET 9
- Web: ASP.NET Core Web API
- Database: PostgreSQL (via Docker Compose)
- ORM: EF Core
- Auth: JWT-based (can be stubbed initially; structure should allow multi-tenant auth later)

## Validation & Error Handling

### Validation Strategy

The API uses a two-tier validation approach:

1. **Request Validation (DTO-level)** - FluentValidation
   - Validates incoming request DTOs before they reach controllers
   - Checks:
     - Required fields
     - Format constraints (email, URL)
     - Length limits (strings, arrays)
     - Numeric ranges
   - Automatically integrated with ASP.NET Core model binding
   - Returns HTTP 400 with structured validation errors

2. **Domain Validation (Business Rules)** - Service Layer
   - Enforced in service implementations
   - Examples:
     - Cannot close an already-closed proposal
     - Cannot issue shares exceeding MaxSupply
     - Cannot add options to a closed proposal
     - User must be organization member to receive shares
   - Throws `InvalidOperationException` or `ArgumentException`
   - Handled by global exception middleware

### Validators

FluentValidation validators exist for all request DTOs:

**User Management:**
- `CreateUserRequestValidator` - Email format, password length (min 8), display name length
- `UpdateUserRequestValidator` - Optional fields with same constraints

**Organization Management:**
- `CreateOrganizationRequestValidator` - Name required (max 200 chars), description (max 1000 chars)
- `UpdateOrganizationRequestValidator` - Same constraints for optional fields

**Proposal Management:**
- `CreateProposalRequestValidator` - Title required (max 200 chars), EndAt > StartAt, quorum 0-100%
- `UpdateProposalRequestValidator` - Same constraints for optional fields
- `AddProposalOptionRequestValidator` - Option text required (max 200 chars)
- `CastVoteRequestValidator` - User ID and option ID required

**Share Management:**
- `CreateShareTypeRequestValidator` - Name/symbol required, voting weight >= 0, MaxSupply > 0 if set
- `UpdateShareTypeRequestValidator` - Same constraints for optional fields
- `CreateShareIssuanceRequestValidator` - Quantity > 0, user/shareType IDs required

**Membership Management:**
- `CreateMembershipRequestValidator` - User ID required, role must be valid enum

**Webhook Management:**
- `CreateWebhookEndpointRequestValidator` - Valid HTTP(S) URL, secret min 16 chars, at least one event
- `UpdateWebhookEndpointRequestValidator` - Same constraints

### Error Response Format

All errors follow RFC 7807 ProblemDetails format:

**Validation Error (HTTP 400):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Email": ["Email must be a valid email address."],
    "Password": ["Password must be at least 8 characters."]
  },
  "traceId": "00-..."
}
```

**Domain Validation Error (HTTP 400):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Invalid Operation",
  "status": 400,
  "detail": "Cannot update proposal in Closed state.",
  "instance": "/proposals/abc-123"
}
```

**Not Found (HTTP 404):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Not Found",
  "status": 404,
  "detail": "The requested resource was not found.",
  "instance": "/users/123"
}
```

**Server Error (HTTP 500):**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.6.1",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred. Please try again later.",
  "instance": "/api/..."
}
```

In Development mode, 500 errors include additional debugging information in the `extensions` field.

### Exception Handling Middleware

The `GlobalExceptionHandlerMiddleware` catches all unhandled exceptions and converts them to ProblemDetails responses:

- `InvalidOperationException` → 400 Bad Request
- `ArgumentException` → 400 Bad Request  
- `DomainValidationException` (custom) → 400 Bad Request with validation errors
- `ResourceNotFoundException` (custom) → 404 Not Found
- All other exceptions → 500 Internal Server Error

Controllers no longer need try-catch blocks for business logic exceptions - they bubble up to the middleware automatically.

## Solution Structure

- `FanEngagement.Api`
  - ASP.NET Core startup, DI configuration, controllers (or minimal APIs), request/response models.
  - **Middleware:** Global exception handler
  - **Exceptions:** Custom exception types for domain validation
- `FanEngagement.Application`
  - Application services / use cases.
  - DTOs, validators, orchestration logic.
  - **Validators:** FluentValidation validators for all request DTOs
- `FanEngagement.Domain`
  - Entities, value objects, domain services (pure C#).
- `FanEngagement.Infrastructure`
  - EF Core DbContext and mappings.
  - Repository implementations.
  - Migration scripts.
- `FanEngagement.Tests`
  - Unit tests for Domain and Application.
  - Basic integration tests for key API endpoints.

## Initial API Surface (v1)

Focus on CRUD and basic flows:

- Organizations
  - `POST /organizations`
  - `GET /organizations`
  - `GET /organizations/{id}`
  - `PUT /organizations/{id}`
- Share Types
  - `POST /organizations/{orgId}/share-types`
  - `GET /organizations/{orgId}/share-types`
- Share Issuances
  - `POST /organizations/{orgId}/share-issuances`
  - `GET /organizations/{orgId}/users/{userId}/balances`
- Proposals
  - `POST /organizations/{orgId}/proposals`
  - `GET /organizations/{orgId}/proposals`
  - `POST /proposals/{id}/votes`
- Webhooks
  - `POST /organizations/{orgId}/webhooks`
  - System will later POST out to those URLs for events (e.g. `ProposalFinalized`).

## Pagination and Filtering

FanEngagement provides consistent pagination and filtering across list endpoints to ensure scalability and usability.

### Pagination Model

All list endpoints support optional pagination through query parameters:

- **`page`** (integer, optional, default: 1): The page number to retrieve (1-based indexing)
- **`pageSize`** (integer, optional, default: 10): Number of items per page (min: 1, max: 100)

### Response Format

Paginated responses return a `PagedResult<T>` object with the following structure:

```json
{
  "items": [],         // Array of items for the current page
  "totalCount": 0,     // Total number of items across all pages
  "page": 1,           // Current page number
  "pageSize": 10,      // Items per page
  "totalPages": 0,     // Total number of pages
  "hasPreviousPage": false,  // Whether a previous page exists
  "hasNextPage": false       // Whether a next page exists
}
```

### Filtering Capabilities

Different endpoints support specific filters based on the resource type:

#### Users (`GET /users`)
- **`search`** (string, optional): Filter by email or display name (case-insensitive substring match)
- Example: `GET /users?page=1&pageSize=20&search=john`

#### Organizations (`GET /organizations`)
- **`search`** (string, optional): Filter by organization name (case-insensitive substring match)
- Example: `GET /organizations?page=1&pageSize=20&search=team`

#### Proposals (`GET /organizations/{orgId}/proposals`)
- **`status`** (enum, optional): Filter by proposal status (`Draft`, `Open`, `Closed`, `Finalized`)
- **`search`** (string, optional): Filter by proposal title (case-insensitive substring match)
- Example: `GET /organizations/{orgId}/proposals?page=1&pageSize=10&status=Open&search=budget`

### Backward Compatibility

All pagination and filtering parameters are optional. If no pagination parameters are provided, endpoints return all items (legacy behavior). This ensures backward compatibility with existing clients.

### Validation

- `page` must be ≥ 1 (returns 400 Bad Request if invalid)
- `pageSize` must be between 1 and 100 (returns 400 Bad Request if invalid)
- Invalid filter values are ignored or return empty results

### Frontend Integration

Frontend components for pagination and filtering:

- **`Pagination` component**: Renders page navigation controls
- **`SearchInput` component**: Provides debounced search input (300ms delay)
- All admin list pages use these components for consistent UX

Example usage in frontend:
```typescript
const { data, loading } = await usersApi.getAllPaged(page, pageSize, searchQuery);
// data is PagedResult<User>
```

## Non-Functional Requirements

- Multi-tenant aware: most operations are scoped by `OrganizationId`.
- Clean separation of concerns:
  - Domain logic does not depend on EF Core or ASP.NET.
- EF Core migrations for schema evolution.
- Tests:
  - Domain unit tests for entities and domain services.
  - Integration tests hitting a test DB for core endpoints.
