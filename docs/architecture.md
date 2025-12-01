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
    - `LastError` (short error message from last failed delivery attempt, max 1000 chars)

### Webhook Delivery & Observability

FanEngagement provides comprehensive observability for webhook deliveries to help admins diagnose integration issues.

#### Delivery Status Tracking

Each `OutboundEvent` tracks its delivery lifecycle:
- **Pending**: Event created, awaiting delivery
- **Delivered**: Successfully sent to all matching webhook endpoints
- **Failed**: Delivery failed after maximum retry attempts (3 by default)

The `LastError` field captures the reason for the most recent failure, including:
- HTTP status codes and reason phrases (e.g., "HTTP 500 Internal Server Error from https://example.com/webhook")
- Connection timeouts (e.g., "Request timeout to https://example.com/webhook")
- Network errors (e.g., "HTTP error: Connection refused")

#### Admin UI Fields

The webhook events admin page (`/admin/organizations/:orgId/webhook-events`) displays:

| Field | Description |
|-------|-------------|
| Event Type | The type of event (e.g., `ProposalCreated`, `VoteCast`) |
| Status | Current delivery status with color-coded badges |
| Attempt Count | Number of delivery attempts made |
| Last Attempt | Timestamp of the most recent delivery attempt |
| Last Error | Truncated error message (full message in detail view) |

#### Retry Behavior

Failed events can be manually retried by OrgAdmins or GlobalAdmins:

1. **Automatic Retries**: The background worker retries failed deliveries up to 3 times
2. **Manual Retry**: Admins can click "Retry" on failed events to reset them to `Pending`
3. **Retry API**: `POST /organizations/{orgId}/outbound-events/{eventId}/retry`
   - Only works for events in `Failed` status
   - Resets status to `Pending` and clears `LastError`
   - Returns 404 if event not found or not in retryable state

#### Filtering Options

Events can be filtered by:
- **Status**: Pending, Delivered, Failed
- **Event Type**: Dropdown populated with observed event types
- **Date Range**: Optional `fromDate` and `toDate` query parameters

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

## Observability & Health

FanEngagement implements comprehensive observability features including health checks, structured logging with correlation IDs, and metrics hooks for monitoring.

### Health Checks

The application provides two health check endpoints suitable for container orchestration platforms (Docker, Kubernetes):

#### `/health/live` - Liveness Check
- **Purpose:** Indicates the application is running and can accept requests
- **Checks:** None (always returns Healthy if the app is running)
- **HTTP Response:**
  - `200 OK` - Application is alive
- **Use Case:** Container orchestration liveness probes

#### `/health/ready` - Readiness Check
- **Purpose:** Indicates the application is ready to serve traffic
- **Checks:**
  1. **PostgreSQL Database** (`postgresql`)
     - Verifies database connection
     - Tags: `ready`, `db`
  2. **Database Context** (`database`)
     - Verifies EF Core DbContext can connect
     - Tags: `ready`, `db`
  3. **Background Services** (`background_services`)
     - Verifies critical background services are registered:
       - `ProposalLifecycleBackgroundService`
       - `WebhookDeliveryBackgroundService`
     - Status: `Degraded` if services missing, `Healthy` if configured
     - Tags: `ready`
- **HTTP Response:**
  - `200 OK` - All checks passed (Healthy)
  - `503 Service Unavailable` - One or more checks failed (Unhealthy/Degraded)
- **Use Case:** Container orchestration readiness probes, load balancer health checks

**Implementation:**
- Health checks registered in `FanEngagement.Infrastructure/DependencyInjection.cs`
- Background services check: `FanEngagement.Infrastructure/HealthChecks/BackgroundServicesHealthCheck.cs`
- Endpoints configured in `FanEngagement.Api/Program.cs`

### Structured Logging

All key operations use structured logging with contextual properties for better observability and debugging.

#### Correlation ID
- **Middleware:** `CorrelationIdMiddleware` (runs early in pipeline)
- **Header:** `X-Correlation-ID`
- **Behavior:**
  - Reads correlation ID from request header if present
  - Generates new GUID if not present
  - Adds to response headers
  - Adds to `ILogger` scope for all subsequent logging in the request
- **Scope Properties:**
  - `CorrelationId` - Unique request identifier
  - `RequestPath` - Request path (e.g., `/api/proposals/123`)
  - `RequestMethod` - HTTP method (GET, POST, etc.)

#### Structured Log Examples

**Proposal Lifecycle Transitions:**
```csharp
logger.LogInformation(
    "Proposal lifecycle transition: {ProposalId} (OrgId: {OrganizationId}, Title: {Title}) transitioned from {OldStatus} to {NewStatus}, EligibleVotingPower: {EligibleVotingPower}",
    proposal.Id, proposal.OrganizationId, proposal.Title, oldStatus, proposal.Status, proposal.EligibleVotingPowerSnapshot);
```

**Vote Cast (minimal PII):**
```csharp
logger.LogInformation(
    "Vote cast: ProposalId: {ProposalId}, OrgId: {OrganizationId}, OptionId: {ProposalOptionId}, VotingPower: {VotingPower}",
    proposalId, proposal.OrganizationId, request.ProposalOptionId, votingPower);
```

**Webhook Delivery:**
```csharp
logger.LogInformation(
    "Successfully delivered event {EventId} (EventType: {EventType}, OrgId: {OrganizationId}) to endpoint {EndpointUrl} (EndpointId: {EndpointId}), Status: {StatusCode}",
    outboundEvent.Id, outboundEvent.EventType, outboundEvent.OrganizationId, endpoint.Url, endpoint.Id, (int)response.StatusCode);
```

**Background Service Operations:**
```csharp
logger.LogInformation(
    "Automatically opened proposal {ProposalId} (OrgId: {OrganizationId}, Title: {Title})",
    proposal.Id, proposal.OrganizationId, proposal.Title);
```

#### Key Areas with Structured Logging

1. **ProposalService** (`FanEngagement.Infrastructure/Services/ProposalService.cs`)
   - Lifecycle transitions (Open, Close, Finalize)
   - Vote casting
   - Validation failures with context

2. **WebhookDeliveryBackgroundService** (`FanEngagement.Infrastructure/BackgroundServices/WebhookDeliveryBackgroundService.cs`)
   - Event processing batch operations
   - Individual delivery attempts
   - Success/failure with endpoint details
   - Retry attempts and final failures

3. **ProposalLifecycleBackgroundService** (`FanEngagement.Infrastructure/BackgroundServices/ProposalLifecycleBackgroundService.cs`)
   - Automatic proposal transitions
   - Validation errors
   - Processing failures

4. **GlobalExceptionHandlerMiddleware** (`FanEngagement.Api/Middleware/GlobalExceptionHandlerMiddleware.cs`)
   - Unhandled exceptions with stack traces

### Metrics

FanEngagement uses `System.Diagnostics.Metrics` for instrumentation. Metrics can be exported to monitoring systems like Prometheus, Grafana, Application Insights, etc.

**Metrics Service:** `FanEngagement.Infrastructure/Metrics/FanEngagementMetrics.cs`

#### Available Metrics

**Counters (cumulative totals):**

1. **`webhook_deliveries_total`**
   - Description: Total number of webhook delivery attempts
   - Tags:
     - `success` (bool) - Whether delivery succeeded
     - `event_type` (string) - Type of event (e.g., "ProposalOpened")
     - `organization_id` (string) - Organization ID
   - Recorded: After each webhook delivery attempt

2. **`proposal_transitions_total`**
   - Description: Total number of proposal state transitions
   - Tags:
     - `from_status` (string) - Previous status (e.g., "Draft")
     - `to_status` (string) - New status (e.g., "Open")
     - `organization_id` (string) - Organization ID
   - Recorded: After each successful proposal transition

3. **`votes_cast_total`**
   - Description: Total number of votes cast
   - Tags:
     - `proposal_id` (string) - Proposal ID
     - `organization_id` (string) - Organization ID
   - Recorded: After each successful vote

**Observable Gauges (current state):**

4. **`outbound_events_pending`**
   - Description: Number of pending outbound webhook events
   - Update: On-demand when scraped (requires provider function to be set)

5. **`proposals_by_status`**
   - Description: Number of proposals by status
   - Tags:
     - `status` (string) - Proposal status
   - Update: On-demand when scraped (requires provider function to be set)

#### Integrating Metrics

Metrics are injected into services as needed:

```csharp
public class ProposalService(
    FanEngagementDbContext dbContext,
    IOutboundEventService outboundEventService,
    FanEngagementMetrics metrics,  // Inject metrics
    ILogger<ProposalService> logger) : IProposalService
{
    // Record transition
    metrics.RecordProposalTransition(
        oldStatus.ToString(), 
        proposal.Status.ToString(), 
        proposal.OrganizationId);

    // Record vote
    metrics.RecordVoteCast(proposalId, proposal.OrganizationId);
}
```

#### Exporting Metrics

To export metrics to a monitoring system:

1. **OpenTelemetry** (recommended):
   - Add `OpenTelemetry.Exporter.Prometheus.AspNetCore` package
   - Configure in `Program.cs`:
     ```csharp
     builder.Services.AddOpenTelemetry()
         .WithMetrics(metrics => metrics
             .AddMeter("FanEngagement")
             .AddPrometheusExporter());
     
     app.MapPrometheusScrapingEndpoint(); // Exposes /metrics
     ```

2. **Application Insights**:
   - Add `Microsoft.ApplicationInsights.AspNetCore` package
   - Metrics automatically collected

3. **Custom Exporter**:
   - Implement `System.Diagnostics.Metrics` listener
   - Subscribe to `FanEngagement` meter

#### Observable Gauge Providers

To populate real-time gauge values, set provider functions:

```csharp
// In a startup service or background worker
var metrics = services.GetRequiredService<FanEngagementMetrics>();

metrics.SetPendingOutboundEventsProvider(() =>
{
    using var scope = services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
    return dbContext.OutboundEvents.Count(e => e.Status == OutboundEventStatus.Pending);
});

metrics.SetProposalsByStatusProvider(() =>
{
    using var scope = services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
    return dbContext.Proposals
        .GroupBy(p => p.Status)
        .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
        .ToDictionary(x => x.Status, x => x.Count);
});
```

**Note:** Observable gauges currently require manual provider setup. Consider adding a background service to periodically update cached values for high-traffic scenarios.

## Roles & Permissions

FanEngagement defines a two-tier role model: **Global Roles** (platform-wide) and **Organization Roles** (per-organization). The role model is implemented in the domain entities with **comprehensive authorization enforcement** via policy-based authorization.

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

> **✅ COMPREHENSIVE AUTHORIZATION:** All endpoints have proper authorization enforcement via policy-based authorization. The table below documents the current implementation.

The table below specifies the current authorization model enforced across all API endpoints.

| Action | Current Enforcement | Global User | Global Admin | Org Member | Org OrgAdmin | Implementation Notes |
|--------|---------------------|-------------|--------------|------------|--------------|----------------------|
| **User Management** |
| Create user | ✅ OPEN | ✓ | ✓ | - | - | `[AllowAnonymous]` - anyone can register |
| List all users | ✅ ENFORCED | - | ✓ | - | - | `[Authorize(Policy = "GlobalAdmin")]` |
| View any user | ✅ ENFORCED | - | ✓ | - | - | `[Authorize(Policy = "GlobalAdmin")]` |
| Update any user | ✅ ENFORCED | - | ✓ | - | - | `[Authorize(Policy = "GlobalAdmin")]` |
| Delete any user | ✅ ENFORCED | - | ✓ | - | - | `[Authorize(Policy = "GlobalAdmin")]` |
| View own memberships | ✅ ENFORCED | ✓ (self) | ✓ | - | - | Checks self or Admin role |
| View user statistics | ✅ ENFORCED | - | ✓ | - | - | `[Authorize(Roles = "Admin")]` |
| **Organization Management** |
| Create organization | ✅ ENFORCED | - | ✓ | - | - | `[Authorize(Policy = "GlobalAdmin")]` |
| List all organizations | ✅ OPEN | ✓ | ✓ | - | - | `[AllowAnonymous]` - public directory |
| View organization | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| Update organization | ✅ ENFORCED | - | ✓ | - | ✓ | `[Authorize(Policy = "OrgAdmin")]` |
| **Membership Management** |
| Add member to org | ✅ ENFORCED | - | ✓ | - | ✓ | `[Authorize(Policy = "OrgAdmin")]` |
| List org memberships | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| View membership | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| Get available users | ✅ ENFORCED | - | ✓ | - | ✓ | `[Authorize(Policy = "OrgAdmin")]` |
| Remove member | ✅ ENFORCED | - | ✓ | - | ✓ | `[Authorize(Policy = "OrgAdmin")]` |
| Update membership role | ❌ Not supported | - | - | - | - | No API endpoint; delete and recreate membership to change role |
| **Share Type Management** |
| Create share type | ✅ ENFORCED | - | ✓ | - | ✓ | `[Authorize(Policy = "OrgAdmin")]` |
| List share types | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| View share type | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| Update share type | ✅ ENFORCED | - | ✓ | - | ✓ | `[Authorize(Policy = "OrgAdmin")]` |
| **Share Issuance & Balances** |
| Issue shares | ✅ ENFORCED | - | ✓ | - | ✓ | `[Authorize(Policy = "OrgAdmin")]` |
| List share issuances | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| View user share issuances | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| View user share balances | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| **Proposal Management** |
| Create proposal | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| List proposals by org | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| View proposal | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| Update proposal | ✅ ENFORCED | - | ✓ | (creator) | ✓ | `[Authorize(Policy = "ProposalManager")]` |
| Open proposal | ✅ ENFORCED | - | ✓ | (creator) | ✓ | `[Authorize(Policy = "ProposalManager")]` |
| Close proposal | ✅ ENFORCED | - | ✓ | (creator) | ✓ | `[Authorize(Policy = "ProposalManager")]` |
| Finalize proposal | ✅ ENFORCED | - | ✓ | (creator) | ✓ | `[Authorize(Policy = "ProposalManager")]` |
| Add proposal option | ✅ ENFORCED | - | ✓ | (creator) | ✓ | `[Authorize(Policy = "ProposalManager")]` |
| Delete proposal option | ✅ ENFORCED | - | ✓ | (creator) | ✓ | `[Authorize(Policy = "ProposalManager")]` |
| View proposal results | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| **Voting** |
| Cast vote | ✅ ENFORCED | - | ✓ | ✓ | ✓ | `[Authorize(Policy = "OrgMember")]` |
| View user's vote | ✅ ENFORCED | ✓ (self) | ✓ | - | - | `[Authorize]` + manual self/Admin check |
| **Webhook & Events Management** |
| Webhook CRUD | ✅ ENFORCED | - | ✓ | - | ✓ | `[Authorize(Policy = "OrgAdmin")]` |
| Outbound events list/view | ✅ ENFORCED | - | ✓ | - | ✓ | `[Authorize(Policy = "OrgAdmin")]` |
| Retry outbound event | ✅ ENFORCED | - | ✓ | - | ✓ | `[Authorize(Policy = "OrgAdmin")]` |
| **Admin & Dev Tools** |
| Seed dev data | ✅ ENFORCED | - | ✓ | - | - | `[Authorize(Roles = "Admin")]` + environment check |

**Legend:**
- ✅ ENFORCED: Proper policy-based authorization checks in place
- ✅ OPEN: Intentionally open access (user registration, public directory)
- ❌ Not supported: Feature not implemented
- ✓ = Allowed access
- - = Access denied
- (self) = Allowed only for own resources
- (creator) = Allowed if user is the proposal creator

### Authorization Rules

1. **Global Admin Override**: Users with `UserRole.Admin` have implicit permission for all actions, regardless of organization membership or role.
   > **Security Note:** Global Admins bypass all organization-level access controls and should be granted only to trusted platform operators.

2. **Organization Membership Required**: For any organization-scoped action, the user must have an `OrganizationMembership` record for that organization (unless they are a Global Admin).

3. **Organization Role Check**: For organization-scoped actions, the system:
   - Extracts the `organizationId` from the route or request
   - Queries `OrganizationMembership` where `UserId = currentUser.Id AND OrganizationId = organizationId`
   - Checks the `Role` property of the membership record
   - Grants or denies access based on the policy requirements

4. **Self-Access**: Users can access their own resources (profile, memberships, votes, balances) without needing special roles.

5. **Creator Privileges**: Users who create proposals have permission to manage those proposals (update, open, close, finalize, manage options) via the `ProposalManager` policy, even if they are not OrgAdmins.

6. **Privilege Escalation Prevention**: OrgAdmins cannot modify their own membership role to prevent privilege escalation. Only Global Admins or other OrgAdmins can change an OrgAdmin's role.

### Authorization Infrastructure

FanEngagement implements comprehensive policy-based authorization using ASP.NET Core's authorization framework.

> **📖 Detailed Documentation**: For comprehensive documentation of the authorization system, including handler implementation details, code examples, and guidance for adding authorization to new endpoints, see [Authorization Infrastructure](./authorization.md).

#### Authorization Policies

The following policies are registered in `Program.cs`:

| Policy | Requirement | Description |
|--------|-------------|-------------|
| `GlobalAdmin` | Admin role | Requires `UserRole.Admin` global role |
| `OrgMember` | Organization membership | Requires any membership in the target organization |
| `OrgAdmin` | Organization admin role | Requires `OrganizationRole.OrgAdmin` in the target organization |
| `ProposalManager` | Proposal creator or OrgAdmin | Allows proposal creator OR OrgAdmin to manage proposals |

#### Authorization Handlers

Custom handlers in `backend/FanEngagement.Api/Authorization/` implement the authorization logic:

- **`OrganizationMemberHandler`**: Validates user has any membership in the organization (extracted from route)
- **`OrganizationAdminHandler`**: Validates user has OrgAdmin role in the organization
- **`ProposalManagerHandler`**: Validates user is either the proposal creator or an OrgAdmin
- **`ProposalMemberHandler`**: Handles `OrgMember` policy for proposal routes by extracting `proposalId` from the route and looking up the associated organization

#### Global Admin Bypass

All organization-level handlers check for Global Admin status first. Users with `UserRole.Admin` automatically pass all organization-level authorization checks, providing platform-wide administrative access.

#### Route Context Extraction

The `RouteValueHelpers` utility extracts organization context from route parameters. It checks for:
- `organizationId` (standard org routes)
- `id` (fallback for `/organizations/{id}` style routes)

For proposal routes, the `ProposalMemberHandler` and `ProposalManagerHandler` extract `proposalId` from the route and look up the associated organization from the database.

### JWT Claims & Implementation

- **JWT Claims**: The JWT token includes role claims for the user's global role via `ClaimTypes.Role` and user ID via `ClaimTypes.NameIdentifier`
- **Organization Role Checks**: Organization-specific role checks query `OrganizationMembership` records via custom authorization handlers
- **Implementation**: Consistent policy-based authorization using `[Authorize(Policy = "...")]` attributes on controllers and actions
- **Global Admin Bypass**: Authorization handlers check for Admin role and automatically succeed for Global Admins

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

## Multi-Organization Membership and Context Selection

FanEngagement is a true multi-tenant platform where users can belong to multiple organizations simultaneously. Each membership is independent, with its own role assignment (Member or OrgAdmin) per organization.

### Multi-Organization Support

**Core Principles:**
- **Multiple Memberships**: A single user can be a member of any number of organizations
- **Independent Roles**: A user's role in one organization (e.g., OrgAdmin) has no bearing on their role in another organization
- **Per-Organization Data**: All org-scoped resources (share types, proposals, votes, webhooks) are isolated per organization
- **Global Admin Override**: Users with `UserRole.Admin` (Global Admin) have implicit access to all organizations regardless of membership

**Membership Model:**
- Each membership is represented by an `OrganizationMembership` record linking a User to an Organization
- The same user can have multiple `OrganizationMembership` records, one for each organization they belong to
- Example: Alice can be an `OrgAdmin` in "Manchester United FC" and a regular `Member` in "Liverpool FC Supporters Club"

### Frontend Organization Context

To support users belonging to multiple organizations, the frontend implements an **active organization context** that determines which organization's data is displayed and which organization actions are performed against.

#### Active Organization Selection

**Endpoint:** `GET /users/me/organizations`
- Returns the current authenticated user's organization memberships
- Includes organization details (ID, name) and the user's role in each organization
- Used by the frontend to populate the organization selector and determine available organizations

**Context Storage:**
- The active organization is stored in the browser's `localStorage` for persistence across page reloads
- The context includes: organization ID, name, and optional branding information (logo URL, colors)
- When a user logs in:
  - If they belong to **one organization**: That organization is automatically set as active
  - If they belong to **multiple organizations**: Either prompt for selection or default to the first/most recent, allowing easy switching via UI

**Organization Selector UI:**
- For users with multiple organizations, an organization switcher dropdown is displayed in the header/navigation
- The selector shows:
  - Organization name
  - User's role in each organization (displayed as a badge: "OrgAdmin" or "Member")
- Switching organizations updates the active context and reloads or redirects to show data for the newly selected organization

#### Route Integration

**Organization-Scoped Routes:**
- Routes that include `organizationId` in the URL (e.g., `/me/organizations/:orgId`, `/admin/organizations/:orgId/proposals`) continue to use the explicit ID from the route
- The active organization context synchronizes with the `orgId` parameter when navigating to org-scoped routes
- This ensures URLs remain bookmarkable and shareable while maintaining context awareness

**Context-Aware Components:**
- Org-scoped pages use the active organization context to:
  - Make API calls with the correct `organizationId`
  - Display organization branding (logo, colors)
  - Check permissions using the user's role in the active organization
- Permission helpers (e.g., `isOrgAdmin(orgId)`) use the active organization by default when no explicit orgId is provided

#### Context Hook and Provider

**Frontend Implementation:**
- `OrgContext` / `useActiveOrganization()` hook provides access to the active organization
- Components can:
  - Read the active organization (ID, name, role, branding)
  - Switch the active organization
  - Check if a user belongs to multiple organizations (to show/hide the selector)

**Example Usage:**
```typescript
const { activeOrg, setActiveOrg, hasMultipleOrgs } = useActiveOrganization();

// Use active org for API calls
const proposals = await proposalsApi.getByOrganization(activeOrg.id);

// Show org selector only if user has multiple orgs
{hasMultipleOrgs && <OrganizationSelector />}
```

### Multi-Organization Scenarios

**Scenario 1: User with Single Organization**
- Alice is only a member of "Manchester United FC"
- On login, "Manchester United FC" is automatically set as her active organization
- No organization selector is shown (no need to switch)
- All org-scoped pages show data for "Manchester United FC"

**Scenario 2: User with Multiple Organizations**
- Bob is a member of "Manchester United FC" (OrgAdmin) and "Liverpool FC" (Member)
- On login, one of his organizations is set as active (e.g., most recent or first alphabetically)
- Organization selector dropdown is shown in the header
- Bob can switch between organizations via the dropdown
- When he switches to "Liverpool FC", all org-scoped views update to show Liverpool's data
- His permissions change based on the active org: OrgAdmin actions available for Manchester, not for Liverpool

**Scenario 3: Global Admin**
- Carol is a Global Admin (`UserRole.Admin`)
- She has implicit access to all organizations, regardless of membership
- She can view and manage any organization via the admin panel
- When she navigates to org-scoped pages, the active org context still applies for UI purposes (branding, focused data view)
- Authorization checks recognize her as Global Admin and bypass org-level permissions

### API Endpoint Summary

**Organization Membership Queries:**
- `GET /users/me/organizations`: Get current user's organization memberships (for org selector)
- `GET /users/{userId}/memberships`: Get any user's memberships (admin use case)
- `GET /organizations/{orgId}/memberships`: Get all members of a specific organization (requires OrgAdmin or Global Admin)

**Usage:**
- Frontend uses `/users/me/organizations` on login to populate the org selector and determine if the user belongs to multiple orgs
- The endpoint returns `MembershipWithOrganizationDto[]`, including org name and user role, suitable for building the UI selector

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

## Testing Strategy

FanEngagement employs a comprehensive testing strategy covering domain logic, integration flows, authorization, and multi-tenancy. Tests are located in `backend/FanEngagement.Tests/`.

### Domain/Unit Tests

Domain services contain pure business logic with no infrastructure dependencies, making them ideal for unit testing:

| Test File | Coverage |
|-----------|----------|
| `ProposalGovernanceServiceTests.cs` | Proposal lifecycle state transitions, validation rules |
| `ProposalGovernanceEdgeCaseTests.cs` | Edge cases: disallowed transitions, quorum edge cases, tied results |
| `VotingPowerCalculatorTests.cs` | Voting power calculation from share balances |

**Key Domain Tests:**
- **State Transitions**: Validates all allowed/disallowed proposal status transitions (Draft → Open → Closed → Finalized)
- **Quorum Calculation**: Tests quorum met/not met at various thresholds including edge cases (0%, 100%, exact threshold)
- **Voting Power**: Tests voting power calculation across multiple share types with different weights
- **Time Windows**: Validates voting eligibility based on `StartAt` and `EndAt` constraints

### Integration Tests

Integration tests use `WebApplicationFactory<Program>` with an in-memory database to test full HTTP flows:

| Test File | Coverage |
|-----------|----------|
| `ProposalLifecycleTests.cs` | Proposal CRUD, lifecycle transitions via API |
| `EndToEndProposalWorkflowTests.cs` | Complete proposal flow from creation through finalization |
| `AuthorizationIntegrationTests.cs` | Role-based access control for all endpoints |
| `MultiTenancyTests.cs` | Cross-organization access restrictions |
| `OutboundEventEnqueueTests.cs` | Webhook event creation during lifecycle transitions |

**Key Integration Tests:**
- **End-to-End Workflow**: Create org → Share types → Issue shares → Create proposal → Vote → Close → Finalize
- **Multi-Tenancy**: Users in Org A cannot access resources in Org B (proposals, share types, memberships)
- **Authorization Matrix**: GlobalAdmin, OrgAdmin, OrgMember, and non-member access verification
- **Outbound Events**: Verifies `ProposalOpened`, `ProposalClosed`, `ProposalFinalized` events are enqueued with correct payloads

### Running Tests Locally

**Using bare dotnet (in-memory database):**
```bash
# Run all tests
dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release

# Run with verbose output
dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release --verbosity normal

# Run specific test class
dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release --filter "FullyQualifiedName~ProposalGovernanceEdgeCaseTests"

# Run specific test
dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release --filter "FullyQualifiedName~CompleteProposalLifecycle_FromDraftToFinalized_AllStepsSucceed"
```

**Using Docker Compose (PostgreSQL database):**
```bash
# Start database
docker compose up -d db

# Run tests
docker compose run --rm tests dotnet test backend/FanEngagement.Tests/FanEngagement.Tests.csproj --configuration Release

# Tear down
docker compose down -v
```

### Test Patterns

**Setting up test data:**
```csharp
// Create admin and get auth token
var (_, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
_client.AddAuthorizationHeader(adminToken);

// Create organization
var org = await CreateOrganizationAsync("Test Org");

// Create user with shares
var (user, userToken) = await CreateMemberWithSharesAsync(org.Id, shareTypeId, 100m);
```

**Testing authorization:**
```csharp
// Test that non-member cannot access org resource
_client.AddAuthorizationHeader(nonMemberToken);
var response = await _client.GetAsync($"/organizations/{org.Id}");
Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
```

**Testing domain validation:**
```csharp
// Test invalid state transition
var result = _governanceService.ValidateStatusTransition(proposal, ProposalStatus.Finalized);
Assert.False(result.IsValid);
Assert.Contains("Closed", result.ErrorMessage);
```

### Coverage Summary

The table below shows test counts for the new/expanded test categories in this PR. The 280+ total includes these plus existing tests for controllers, services, and other infrastructure.

| Category | Test Count | Key Scenarios |
|----------|------------|---------------|
| Domain Services | 68 | State transitions, quorum, voting power |
| Authorization | 30 | GlobalAdmin, OrgAdmin, OrgMember, ProposalManager |
| Multi-Tenancy | 12 | Cross-org access denied, same-org access allowed |
| Proposal Lifecycle | 26 | Draft→Open→Closed→Finalized, voting rules |
| Outbound Events | 17 | Event enqueue on lifecycle transitions |
| End-to-End Flows | 8 | Complete workflows from creation to finalization |
| Other (existing) | 119+ | Controllers, services, infrastructure |
| **Total** | **280+** | Full test suite |

## Frontend E2E Testing Strategy

FanEngagement includes Playwright end-to-end tests validating the admin and member governance flows against a running stack (frontend + API + Postgres).

- Headed locally, headless on CI: Configure Playwright to run headed when not on CI to aid debugging; CI runs headless.
- Serialized suites: Long governance journeys are split into multiple tests inside a `test.describe.serial` block to share state deterministically and isolate failures.
- Deterministic navigation: Capture IDs from POST responses (e.g., `proposalId` from `POST /organizations/{orgId}/proposals`) and navigate directly to pages using those IDs.
- Confirm dialogs: Admin lifecycle actions (Open, Close, Finalize) require accepting a confirm dialog before asserting status; tests handle the dialog explicitly.
- Network waits: Prefer `page.waitForResponse` and assert success for mutating endpoints, especially:
  - `POST /proposals/:id/options`
  - `POST /proposals/:id/open`
  - `POST /proposals/:id/close`
  - `POST /proposals/:id/finalize`
- Stable selectors: Prefer `data-testid` hooks for headings and primary actions and role-based queries for tables. Example: Users page heading exposes `data-testid="users-heading"`; webhook events use `getByRole('cell', { name: 'ProposalClosed' })`.
- Option UI: Ensure the “Add Option” form is toggled open before filling the "Option Text" field.
- Environment: Run with `VITE_API_BASE_URL` pointing to the active API (`/api` with proxy in Vite, or `http://localhost:8080` with Docker Compose).

Quick local run:

```bash
pushd frontend
VITE_API_BASE_URL=http://localhost:8080 npx playwright test e2e/admin-governance.spec.ts --reporter=list
popd
```

### On-Demand in Docker

- Compose profiles: the `e2e` service is behind the `e2e` profile and does not start during a normal `docker compose up`. This keeps the stack fast by default.
- Run the full suite on-demand with the helper script (starts the stack, runs tests headless in-container, cleans up E2E data on success, then stops services):

```bash
./scripts/run-e2e.sh
```

- Internals: the script uses `docker compose --profile e2e run --rm e2e` to execute tests, and sets `CI=1` so Playwright runs headless inside the Linux container.

### Cleanup & Reset

- Post-success cleanup: the E2E script calls `POST /admin/cleanup-e2e-data` (Admin-only, Dev/Demo only) to remove organizations created by tests (names starting with `E2E ...`). This is skipped on failures to preserve context for debugging.
- Full reset (manual): the Admin Dev Tools page exposes a "Reset to Seed Data" action that deletes all organizations and non-admin users, then reseeds the original sample data via `POST /admin/reset-dev-data`.

### CI/headless Behavior

- Locally: Playwright runs headed by default to aid debugging.
- In containers/CI: `CI=1` forces headless, one worker, and retry-friendly defaults; no X server is required.
