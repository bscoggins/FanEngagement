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
  - **Branding**: Organizations can customize their visual identity with branding fields (see Branding section below).

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

## Proposal Governance Rules

FanEngagement implements a comprehensive governance model for proposals, defining clear rules for proposal lifecycle, voting eligibility, quorum requirements, result computation, and result visibility.

### Lifecycle States and Transitions

Proposals follow a strict state machine with four states:

```
Draft → Open → Closed → Finalized
```

#### State Definitions

1. **Draft** (`ProposalStatus.Draft`)
   - Initial state for proposals under construction
   - Options can be freely added and deleted
   - Proposal metadata (title, description, dates, quorum) can be edited
   - No voting allowed
   - Results not visible
   - **Requirements to transition to Open:**
     - Must have at least 2 options
     - All required metadata should be configured

2. **Open** (`ProposalStatus.Open`)
   - Active voting state
   - Members with voting power can cast votes
   - Options can still be added (to accommodate late additions)
   - Options cannot be deleted (to prevent vote invalidation)
   - Proposal metadata can still be edited
   - Results visible in real-time
   - **When opened:**
     - `EligibleVotingPowerSnapshot` is captured (total voting power in org at that moment)
     - This snapshot is used for quorum calculation
   - **Voting rules:**
     - One vote per user per proposal
     - User must have voting power > 0 to vote
     - If `StartAt` is set, voting only allowed after that time
     - If `EndAt` is set, voting only allowed before that time

3. **Closed** (`ProposalStatus.Closed`)
   - Voting has ended
   - No more votes accepted
   - Results are computed and stored:
     - `WinningOptionId` - Option with highest total voting power
     - `QuorumMet` - Whether quorum requirement was satisfied
     - `TotalVotesCast` - Sum of all voting power cast
     - `ClosedAt` - Timestamp of closure
   - Results fully visible
   - Cannot be modified further
   - Can transition to Finalized for archival/locking

4. **Finalized** (`ProposalStatus.Finalized`)
   - Terminal state for completed proposals
   - Results are locked and immutable
   - Used to mark proposals where outcome has been executed or recorded permanently
   - No transitions allowed from this state

#### Allowed Transitions

| From | To | Triggered By | Notes |
|------|-----|--------------|-------|
| Draft | Open | Manual (creator/OrgAdmin) | Requires 2+ options |
| Open | Closed | Manual (creator/OrgAdmin) | Computes and stores results |
| Closed | Finalized | Manual (OrgAdmin) | Marks outcome as executed |

**No other transitions are allowed.** For example:
- Cannot skip from Draft to Closed
- Cannot reopen a Closed proposal
- Cannot move backward in the lifecycle

### Voting Eligibility

Users are eligible to vote on a proposal if all of the following conditions are met:

1. **Membership**: User must be a member of the organization (`OrganizationMembership` exists)
2. **Voting Power**: User must have voting power > 0 in the organization
3. **Proposal State**: Proposal must be in `Open` status
4. **Time Window** (if configured):
   - Current time must be >= `StartAt` (if set)
   - Current time must be < `EndAt` (if set)
5. **One Vote Rule**: User has not already voted on this proposal

#### Voting Power Calculation

Voting power is calculated as:

```
VotingPower = Sum(ShareBalance.Balance × ShareType.VotingWeight)
```

Across all share types in the organization where the user has a non-zero balance.

**Snapshot Timing:**
- **Current Implementation**: Voting power is calculated **at the time the vote is cast**
- The calculated voting power is stored in the `Vote.VotingPower` field
- This means voting power can change between when a proposal opens and when a user votes

**Rationale for vote-time snapshot:**
- Reflects the "current" stake of voters at decision time
- Simpler to implement (no need to snapshot all balances at proposal open)
- Prevents issues if shares are issued/transferred during voting period

**Future Consideration:**
- An alternative model would snapshot all eligible voting power when the proposal opens
- This would lock in who can vote and with what power at the moment voting begins
- This prevents gaming by issuing shares during voting

### Quorum Requirements

Quorum determines whether a proposal has sufficient participation to be considered valid.

#### Quorum Configuration

- **Field**: `Proposal.QuorumRequirement` (nullable decimal)
- **Meaning**: Percentage (0-100) of total eligible voting power that must participate
- **Example**: `50.0` means at least 50% of eligible voting power must vote

#### Quorum Calculation

When a proposal is closed, quorum is evaluated:

```
Required Voting Power = EligibleVotingPowerSnapshot × (QuorumRequirement / 100)
Quorum Met = TotalVotesCast >= Required Voting Power
```

- **`EligibleVotingPowerSnapshot`**: Captured when proposal transitions to `Open` (sum of all voting power in the org at that moment)
- **`TotalVotesCast`**: Sum of `Vote.VotingPower` for all votes on the proposal

#### Quorum Outcomes

- **If quorum is met** (`QuorumMet = true`): Proposal results are considered valid; winning option is determined
- **If quorum is not met** (`QuorumMet = false`): Proposal results are recorded but may be considered invalid by governance rules (external to the platform)
- **If no quorum requirement set** (`QuorumRequirement = null`): Quorum is always considered met

### Result Computation

Results are computed when a proposal transitions to `Closed` status.

#### Result Fields Populated

1. **`WinningOptionId`**: The `ProposalOption.Id` with the highest `TotalVotingPower`
   - In case of a tie, the option with the lowest `OptionId` (lexicographically) wins
   - If no votes were cast, this field is `null`

2. **`QuorumMet`**: Boolean indicating whether quorum requirement was satisfied
   - Always `true` if no quorum requirement is set
   - Calculated as described above

3. **`TotalVotesCast`**: Sum of `Vote.VotingPower` across all votes
   - Represents total voting power that participated

4. **`ClosedAt`**: Timestamp when the proposal was closed

#### Per-Option Results

For each option, the following metrics are computed (on-demand via `GetResults` endpoint):

- **`VoteCount`**: Number of individual votes cast for the option
- **`TotalVotingPower`**: Sum of `Vote.VotingPower` for all votes on the option

Options are ranked by `TotalVotingPower` (descending).

### Result Visibility

Results are visible to users based on proposal status:

| Status | Results Visible | Rationale |
|--------|----------------|-----------|
| Draft | No | Proposal not yet active |
| Open | Yes (real-time) | Allows transparency during voting; may encourage participation |
| Closed | Yes | Voting complete, results finalized |
| Finalized | Yes | Permanent record |

**Real-time results in Open status:**
- Current implementation shows results in real-time during voting
- This promotes transparency but could influence voter behavior
- Future enhancement: Add a configuration flag `ShowResultsWhileOpen` per proposal to make this behavior optional

### Domain Services

Governance logic is encapsulated in pure domain services (no infrastructure dependencies):

#### `ProposalGovernanceService`

Located in `FanEngagement.Domain.Services`, provides:

- **Transition Validation**:
  - `ValidateStatusTransition(proposal, targetStatus)`: Checks if transition is allowed
  - `ValidateCanOpen(proposal)`: Ensures 2+ options before opening
  - `ValidateCanClose(proposal)`: Allows closing from Open only
  - `ValidateCanFinalize(proposal)`: Only Closed proposals can be finalized

- **Operation Validation**:
  - `ValidateCanUpdate(proposal)`: Only Draft/Open proposals can be updated
  - `ValidateCanAddOption(proposal)`: Only Draft/Open proposals
  - `ValidateCanDeleteOption(proposal, hasVotes)`: Only Draft, and only if no votes
  - `ValidateCanVote(proposal, hasExistingVote)`: Checks status, time window, duplicate votes

- **Result Computation**:
  - `ComputeResults(proposal)`: Aggregates votes, determines winner, checks quorum
  - Returns `ProposalResultComputation` with all computed metrics

- **Result Visibility**:
  - `AreResultsVisible(status)`: Determines if results should be shown

All methods return `GovernanceValidationResult` with `IsValid` and `ErrorMessage` for validation checks.

#### `VotingPowerCalculator`

Located in `FanEngagement.Domain.Services`, provides:

- **`CalculateVotingPower(shareBalances)`**: Computes voting power for a user
- **`CalculateTotalEligibleVotingPower(shareBalances)`**: Computes org-wide eligible voting power
- **`IsEligibleToVote(votingPower)`**: Checks if voting power > 0

### Workflow Examples

#### Creating and Running a Proposal

1. **Create Proposal** (`POST /organizations/{orgId}/proposals`)
   - Proposal created in `Draft` status
   - Add title, description, dates, quorum requirement

2. **Add Options** (`POST /proposals/{proposalId}/options`)
   - Add 2 or more options
   - Options can be modified/deleted while in Draft

3. **Open Proposal** (Manual action by creator/OrgAdmin)
   - Validate: Must have 2+ options
   - Transition to `Open` status
   - Capture `EligibleVotingPowerSnapshot`
   - Voting is now allowed

4. **Cast Votes** (`POST /proposals/{proposalId}/votes`)
   - Members vote (one vote per user)
   - Voting power calculated and stored at cast time
   - Results visible in real-time

5. **Close Proposal** (Manual action by creator/OrgAdmin)
   - Transition to `Closed` status
   - Compute and store results:
     - Determine `WinningOptionId`
     - Check `QuorumMet`
     - Record `TotalVotesCast` and `ClosedAt`

6. **Finalize Proposal** (Optional, OrgAdmin only)
   - Transition to `Finalized` status
   - Marks outcome as executed/permanent

#### Time-Bounded Voting

Proposals can optionally specify `StartAt` and `EndAt` to restrict voting windows:

- **Future Start**: Set `StartAt` to a future date; voting blocked until that time
- **Deadline**: Set `EndAt` to enforce a voting deadline; votes rejected after that time
- **No Time Bounds**: Leave both `null` for open-ended voting (manual close required)

**Automatic Lifecycle Processing:**

The `ProposalLifecycleBackgroundService` automatically processes proposal transitions based on time constraints:

- **Auto-Open**: Draft proposals with `StartAt <= now` are automatically transitioned to Open status
- **Auto-Close**: Open proposals with `EndAt <= now` are automatically transitioned to Closed status
- **Polling Interval**: Configurable via `ProposalLifecycle:PollingIntervalSeconds` (default: 60 seconds)
- **Batch Processing**: Processes up to `ProposalLifecycle:MaxProposalsPerBatch` proposals per cycle (default: 100)

**Manual Operations:**

- Proposals can be manually opened via `POST /proposals/{id}/open` (requires 2+ options)
- Proposals can be manually closed via `POST /proposals/{id}/close`
- Finalize is always manual via `POST /proposals/{id}/finalize` (requires proposal to be Closed)

**Configuration:**

```json
{
  "ProposalLifecycle": {
    "PollingIntervalSeconds": 60,
    "MaxProposalsPerBatch": 100
  }
}
```

**Implementation Details:**

- Background service runs continuously with configurable polling interval
- Uses scoped `DbContext` and `IProposalService` per execution cycle
- Validates transitions using `ProposalGovernanceService` domain logic
- Enqueues outbound events for state changes (ProposalOpened, ProposalClosed)
- Logs all automatic transitions for audit trail
- Handles errors gracefully without stopping service

#### No-Quorum Voting

If a proposal has no quorum requirement (`QuorumRequirement = null`):

- Voting proceeds normally
- When closed, `QuorumMet` is always `true`
- Any level of participation is considered valid

### Authorization and Governance

Governance operations respect the role-based authorization model:

| Operation | Allowed Roles | Notes |
|-----------|---------------|-------|
| Create Proposal | OrgAdmin, Member (within org) | See Roles & Permissions section |
| Open Proposal | OrgAdmin, Creator | Requires validation (2+ options) |
| Close Proposal | OrgAdmin, Creator | Computes results |
| Finalize Proposal | OrgAdmin, Global Admin | Terminal state |
| Add Option | OrgAdmin, Creator | Only in Draft/Open |
| Delete Option | OrgAdmin, Creator | Only in Draft, no votes |
| Update Proposal | OrgAdmin, Creator | Only in Draft/Open |
| Cast Vote | Any Member with voting power | Only in Open, within time window |
| View Results | Any Member | If results visible per status |

See the **Roles & Permissions** section below for detailed authorization rules.

### Non-Goals (Out of Scope)

The following are **not** implemented in this governance model:

1. **Vote Changes**: Users cannot change or revoke their vote once cast
   - Future enhancement: Allow vote changes before proposal closes

2. **Delegated Voting**: Users cannot delegate their voting power to another user
   - Future enhancement: Implement proxy voting

3. **Weighted Options**: All options are equal; no concept of ranked choice or weighted voting
   - Future enhancement: Ranked choice voting

4. **Conditional Quorum**: Quorum is a simple percentage; no complex rules (e.g., "50% quorum OR 100 votes")
   - Future enhancement: Custom quorum formulas

5. **On-Chain Voting**: All voting is off-chain within the platform database
   - Future enhancement: Blockchain integration for immutable vote records

## Background Services

### ProposalLifecycleBackgroundService

Automatically processes proposal lifecycle transitions based on time constraints.

**Location:** `backend/FanEngagement.Infrastructure/BackgroundServices/ProposalLifecycleBackgroundService.cs`

**Configuration:** `backend/FanEngagement.Api/appsettings.json` → `ProposalLifecycle` section

**Responsibilities:**
- Polls database at configurable interval (default: 60 seconds)
- Opens Draft proposals when `StartAt <= now`
- Closes Open proposals when `EndAt <= now`
- Validates all transitions using domain services
- Enqueues outbound events for state changes
- Logs all automatic transitions

**Workflow:**
1. Query proposals due for opening: `Status == Draft AND StartAt <= now`
2. Query proposals due for closing: `Status == Open AND EndAt <= now`
3. For each proposal:
   - Validate transition using `ProposalGovernanceService`
   - Call appropriate service method (`OpenAsync` or `CloseAsync`)
   - Log success or failure
4. Wait for configured interval and repeat

**Error Handling:**
- Individual proposal failures don't stop processing of other proposals
- All errors are logged with proposal ID and title
- Service continues running even if entire cycle fails

**Testing:**
- Background service is disabled in test environment via `TestWebApplicationFactory`
- Integration tests directly call service methods to test lifecycle logic
- Time-based transitions tested with past/future dates

### WebhookDeliveryBackgroundService

Processes pending webhook delivery events.

**Location:** `backend/FanEngagement.Infrastructure/BackgroundServices/WebhookDeliveryBackgroundService.cs`

**Details:** See Webhook & Events Management section.

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

## Organization Onboarding

FanEngagement implements a streamlined organization onboarding process where organizations can be created through the API, with automatic role assignment for the creator.

### Who Can Create Organizations

**Current Implementation:**
- **Global Admins Only**: Organization creation is restricted to users with `UserRole.Admin` (Global Admin)
- Authorization is enforced via the `GlobalAdmin` policy on the `POST /organizations` endpoint
- The endpoint is protected by `[Authorize(Policy = "GlobalAdmin")]` in `OrganizationsController`

**Rationale:**
- This approach ensures controlled onboarding where platform administrators manage organization creation
- Prevents spam or unauthorized organizations from being created
- Allows for potential future enhancements like approval workflows or tiered organization types

**Future Considerations:**
- Self-service organization creation could be enabled for all authenticated users
- Could implement an approval workflow where regular users can request organization creation
- Could add organization tiers (free, premium) with different capabilities

### Automatic OrgAdmin Membership

When a Global Admin creates an organization, the system automatically:

1. **Creates the Organization**: Validates and saves the organization with provided name and description
2. **Creates OrgAdmin Membership**: Automatically creates an `OrganizationMembership` record with:
   - `UserId`: The ID of the user who created the organization (extracted from JWT claims)
   - `OrganizationId`: The newly created organization's ID
   - `Role`: `OrganizationRole.OrgAdmin` (administrator for the specific organization)
   - `CreatedAt`: Current timestamp

3. **Transactional Operation**: Both the organization and membership are saved in a single database transaction, ensuring consistency

**Benefits:**
- The creator immediately has full administrative control over the new organization
- No separate step needed to grant the creator access
- Ensures every organization has at least one administrator from creation
- Follows the principle of least surprise - creator expects to manage their organization

### Organization Creation Flow

**API Endpoint:** `POST /organizations`

**Request Body:**
```json
{
  "name": "Manchester United Supporters Club",
  "description": "Official fan governance organization for MUSC"
}
```

**Authorization:**
- Requires JWT authentication
- Requires `UserRole.Admin` (Global Admin role)
- Returns `401 Unauthorized` if not authenticated
- Returns `403 Forbidden` if user is not a Global Admin

**Validation:**
- `Name`: Required, maximum 200 characters
- `Description`: Optional, maximum 1000 characters

**Response:** `201 Created`
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Manchester United Supporters Club",
  "description": "Official fan governance organization for MUSC",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Behind the Scenes:**
1. Controller extracts user ID from JWT claims (`ClaimTypes.NameIdentifier`)
2. Service validates the creator user exists in the database
3. Service creates the organization record
4. Service creates the OrgAdmin membership record for the creator
5. Both records are saved in a single transaction
6. Organization is returned to the caller

### Initial Organization Setup

After an organization is created with automatic OrgAdmin membership, the creator can:

1. **Add Members**: Invite other users to join the organization
   - Endpoint: `POST /organizations/{orgId}/memberships`
   - Can assign roles: `OrgAdmin` or `Member`

2. **Configure Share Types**: Define the types of shares the organization will issue
   - Endpoint: `POST /organizations/{orgId}/share-types`
   - Configure voting weights, transferability, max supply, etc.

3. **Issue Shares**: Distribute shares to organization members
   - Endpoint: `POST /organizations/{orgId}/share-issuances`
   - Establishes voting power for members

4. **Create Proposals**: Set up governance proposals for voting
   - Endpoint: `POST /organizations/{orgId}/proposals`
   - Define proposal options, quorum requirements, voting periods

5. **Configure Webhooks**: Set up integrations for external notifications
   - Endpoint: `POST /organizations/{orgId}/webhooks`
   - Subscribe to events like proposal finalization

### Security Considerations

**User Validation:**
- Before creating an organization, the service validates that the creator user exists
- If user does not exist, operation fails with `InvalidOperationException`
- Prevents orphaned organizations or dangling membership records

**Authorization Enforcement:**
- The `GlobalAdmin` policy is enforced at the controller level
- Policy checks `User.IsInRole("Admin")` via JWT claims
- Non-admin users receive `403 Forbidden` before service methods are called

**Transaction Safety:**
- Organization and membership creation use a single `SaveChangesAsync` call
- If either operation fails, the entire transaction is rolled back
- Ensures database consistency (no organizations without OrgAdmins, no memberships for non-existent orgs)

**Circular Reference Handling:**
- JSON serialization is configured with `ReferenceHandler.IgnoreCycles`
- Prevents infinite loops when serializing entities with navigation properties
- Allows returning entity objects directly without creating separate DTOs

### Testing

Organization creation behavior is covered by comprehensive integration tests in `OrganizationCreationTests.cs`:

- ✅ `CreateOrganization_AsGlobalAdmin_CreatesOrgAndOrgAdminMembership`: Verifies org creation and automatic membership
- ✅ `CreateOrganization_AsNonAdmin_ReturnsForbidden`: Verifies authorization policy enforcement
- ✅ `CreateOrganization_WithoutAuthentication_ReturnsUnauthorized`: Verifies authentication requirement
- ✅ `CreateOrganization_WithEmptyName_ReturnsBadRequest`: Verifies name validation
- ✅ `CreateOrganization_WithTooLongName_ReturnsBadRequest`: Verifies length validation
- ✅ `CreateOrganization_MultipleOrgsWithSameAdmin_CreatesMultipleMemberships`: Verifies multi-org support

These tests use `WebApplicationFactory` for end-to-end integration testing, covering the full request flow from HTTP to database.

### Future Enhancements

**Self-Service Registration:**
- Allow regular users to create organizations
- Implement approval workflow for new organizations
- Add email verification for organization creators

**Organization Types:**
- Support different organization types (e.g., Sports Club, Non-Profit, Corporate)
- Different default configurations per type
- Type-specific features and limitations

**Onboarding Wizard:**
- Guided setup flow for new organizations
- Step-by-step configuration of shares, members, and proposals
- Templates for common organization structures

**Default Configuration:**
- Apply default share types on organization creation
- Create initial proposal templates
- Set up default governance rules based on organization size or type

## Organization Branding

Organizations can customize their visual identity with optional branding fields that are displayed in the UI when users interact with organization-scoped pages.

### Branding Fields

The `Organization` entity includes the following optional branding fields:

**`LogoUrl` (string, max 2048 characters)**
- URL to the organization's logo image
- Must be a valid absolute HTTP/HTTPS URL
- Displayed in headers and navigation for organization-scoped pages
- If not set, no logo is shown
- **Example:** `https://cdn.example.com/org-logos/manchester-united.png`

**`PrimaryColor` (string, max 50 characters)**
- Primary brand color for the organization
- Used for headers, primary buttons, and accent elements
- Accepts CSS color values (hex, rgb, named colors)
- Defaults to `#0066cc` (platform default blue) if not set
- **Examples:** 
  - `#dc143c` (crimson red)
  - `rgb(220, 20, 60)` (RGB format)
  - `#1e90ff` (dodger blue)

**`SecondaryColor` (string, max 50 characters)**
- Secondary brand color for the organization
- Used for secondary buttons and UI elements
- Accepts CSS color values (hex, rgb, named colors)
- Defaults to `#6c757d` (platform default gray) if not set
- **Examples:**
  - `#696969` (dim gray)
  - `#ffd700` (gold)

### Implementation Details

**Backend:**
- Fields are nullable with appropriate length constraints
- `LogoUrl` is validated to ensure it's a well-formed absolute URL (HTTP/HTTPS only)
- No file upload/storage is implemented - admins provide hosted URLs
- Branding fields are included in all Organization API responses and update requests

**Frontend:**
- `useOrgBranding(orgId)` hook fetches organization branding
- Returns default colors if branding is not configured
- Branding is applied automatically to:
  - Organization page headers with logo display
  - Primary action buttons (View & Vote, etc.)
  - Admin action sections
- Falls back gracefully to platform defaults if branding is not set

**UI Application:**
- Branded header appears on organization-scoped pages when logo or custom colors are set
- Logo displays with max dimensions (60px height, 120px width)
- Primary color used for header background and primary buttons
- Secondary color used for secondary UI elements
- Traditional header shown when no branding is configured

### Usage Examples

**Setting Branding via Admin UI:**
1. Navigate to `/admin/organizations/{orgId}/edit`
2. Fill in the "Branding" section:
   - Logo URL: URL to hosted logo image
   - Primary Color: Use color picker or enter hex/CSS color
   - Secondary Color: Use color picker or enter hex/CSS color
3. Preview shows logo (if valid URL) and color swatches
4. Save changes to apply branding

**API Request Example:**
```json
PUT /organizations/{orgId}
{
  "name": "Manchester United Supporters Club",
  "description": "Official fan governance",
  "logoUrl": "https://cdn.example.com/mu-logo.png",
  "primaryColor": "#da291c",
  "secondaryColor": "#fbe122"
}
```

### Future Enhancements

Potential improvements for branding (not currently implemented):
- File upload for logos (stored in blob storage)
- Theme preview before saving
- Additional color slots (accent, success, warning colors)
- Custom fonts or typography
- Dark mode theme support
- Logo variants (light/dark versions for different backgrounds)

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
