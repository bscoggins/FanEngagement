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

> **⚠️ IMPORTANT:** The permissions documented below represent the **intended model**, not the current implementation. Many endpoints lack proper authorization checks. See "Implementation Status by Endpoint" below for actual enforcement.

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
| Update membership role | ⚠️ AUTH-ONLY | - | ✓ | - | ✓ | `[Authorize]` only - CRITICAL RISK: any authenticated user can change roles; intended model should prevent OrgAdmins from changing their own role |
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
   - ❌ Any authenticated user can add/remove members or change roles for any organization
   - **Risk:** Unauthorized access grants, privilege escalation, membership manipulation

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

## Solution Structure

- `FanEngagement.Api`
  - ASP.NET Core startup, DI configuration, controllers (or minimal APIs), request/response models.
- `FanEngagement.Application`
  - Application services / use cases.
  - DTOs, validators, orchestration logic.
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

## Non-Functional Requirements

- Multi-tenant aware: most operations are scoped by `OrganizationId`.
- Clean separation of concerns:
  - Domain logic does not depend on EF Core or ASP.NET.
- EF Core migrations for schema evolution.
- Tests:
  - Domain unit tests for entities and domain services.
  - Integration tests hitting a test DB for core endpoints.
