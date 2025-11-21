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

FanEngagement uses a two-tier role model: **Global Roles** (platform-wide) and **Organization Roles** (per-organization).

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
  - Can manage memberships (add/remove members, assign roles)
  - Can manage share types and issue shares
  - Can create, edit, and manage proposals
  - Can manage webhook endpoints and view outbound events

### Permissions Matrix

The table below specifies which roles can perform which actions. For organization-scoped actions, the role is determined by looking up the user's `OrganizationMembership.Role` for the relevant organization.

| Action | Global: User | Global: Admin | Org: Member | Org: OrgAdmin | Notes |
|--------|--------------|---------------|-------------|---------------|-------|
| **User Management** |
| View own user profile | ✓ | ✓ | - | - | Users can view their own profile |
| Update own user profile | ✓ | ✓ | - | - | Users can update their own email/display name |
| View any user profile | - | ✓ | - | - | Admin only |
| Update any user profile | - | ✓ | - | - | Admin only (including role changes) |
| Delete any user | - | ✓ | - | - | Admin only |
| List all users | - | ✓ | - | - | Admin only |
| View user statistics | - | ✓ | - | - | Admin only |
| **Organization Management** |
| Create organization | - | ✓ | - | - | Admin only |
| List all organizations | ✓ | ✓ | - | - | All authenticated users |
| View organization details | (member) | ✓ | ✓ | ✓ | Members/OrgAdmins can view their org; Admin can view any |
| Update organization | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| Delete organization | - | ✓ | - | - | Admin only |
| **Membership Management** |
| View org memberships | - | ✓ | - | ✓ | OrgAdmin can view for their org; Admin for any org |
| Add member to org | - | ✓ | - | ✓ | OrgAdmin can add to their org; Admin to any org |
| Remove member from org | - | ✓ | - | ✓ | OrgAdmin can remove from their org; Admin from any org |
| Update membership role | - | ✓ | - | ✓ | OrgAdmin can update in their org; Admin in any org |
| View own memberships | ✓ | ✓ | - | - | Users can view their own org memberships |
| **Share Type Management** |
| Create share type | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| List share types | (member) | ✓ | ✓ | ✓ | Members can view for their org; Admin for any org |
| View share type details | (member) | ✓ | ✓ | ✓ | Members can view for their org; Admin for any org |
| Update share type | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| **Share Issuance & Balances** |
| Issue shares | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| List share issuances | - | ✓ | - | ✓ | OrgAdmin can view for their org; Admin for any org |
| View user share issuances | (self) | ✓ | ✓ (self) | ✓ | Users can view their own; OrgAdmin can view for their org members |
| View user share balances | (self) | ✓ | ✓ (self) | ✓ | Users can view their own; OrgAdmin can view for their org members |
| **Proposal Management** |
| Create proposal | (member) | ✓ | ✓ | ✓ | Members can create for their org; Admin for any org |
| List proposals | (member) | ✓ | ✓ | ✓ | Members can view for their org; Admin for any org |
| View proposal details | (member) | ✓ | ✓ | ✓ | Members can view for their org; Admin for any org |
| Update proposal | (creator) | ✓ | - | ✓ | Proposal creator or OrgAdmin for their org; Admin for any org |
| Close proposal | (creator) | ✓ | - | ✓ | Proposal creator or OrgAdmin for their org; Admin for any org |
| Add/delete proposal options | (creator) | ✓ | - | ✓ | Proposal creator or OrgAdmin for their org; Admin for any org |
| View proposal results | (member) | ✓ | ✓ | ✓ | Members can view for their org; Admin for any org |
| **Voting** |
| Cast vote on proposal | (member) | ✓ | ✓ | ✓ | Members can vote on proposals in their org; Admin can vote on any |
| View own vote | ✓ | ✓ | ✓ | ✓ | Users can view their own votes |
| View any user's vote | - | ✓ | - | - | Admin only |
| **Webhook Management** |
| Create webhook endpoint | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| List webhook endpoints | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| View webhook endpoint | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| Update webhook endpoint | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| Delete webhook endpoint | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| **Outbound Events** |
| List outbound events | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| View outbound event details | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| Retry outbound event | - | ✓ | - | ✓ | OrgAdmin for their org; Admin for any org |
| **Admin & Dev Tools** |
| Seed dev data | - | ✓ | - | - | Admin only, Development environment only |
| Access admin endpoints | - | ✓ | - | - | Admin only |

**Legend:**
- ✓ = Allowed
- - = Not allowed
- (member) = Allowed if user is a member of the relevant organization
- (self) = Allowed only for the user's own resources
- (creator) = Allowed if user is the creator of the resource

### Role Evaluation Rules

1. **Global Admin Override**: A user with `UserRole.Admin` has implicit permission for all actions, regardless of organization membership or role.

2. **Organization Membership Required**: For any organization-scoped action, the user must have an `OrganizationMembership` record for that organization (unless they are a Global Admin).

3. **Organization Role Check**: For organization-scoped actions, the system should:
   - Extract the `organizationId` from the route or request
   - Query `OrganizationMembership` where `UserId = currentUser.Id AND OrganizationId = organizationId`
   - Check the `Role` property of the membership record
   - Grant or deny access based on the permissions matrix above

4. **Self-Access**: Users can always access their own resources (profile, memberships, votes, balances) without needing special roles.

5. **Creator Privileges**: Users who create proposals have implicit permission to manage those proposals (update, close, manage options) even if they are not OrgAdmins, as long as they are members of the organization.

### Implementation Notes

- **Current State**: As of this documentation, the role model is fully defined in the domain entities and exposed via DTOs. Some endpoints use `[Authorize(Roles = "Admin")]` attributes or manual role checks.
- **Future Work**: A comprehensive authorization policy system should be implemented to enforce these permissions consistently across all endpoints. This should use ASP.NET Core's policy-based authorization with custom requirements and handlers.
- **JWT Claims**: The JWT token includes role claims for the user's global role. Organization-specific role checks require database lookups of `OrganizationMembership` records.

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
