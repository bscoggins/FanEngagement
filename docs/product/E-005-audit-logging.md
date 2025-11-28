# E-005 – Implement Thorough Audit Logging Across the Application

**Theme:** T3 – Governance Transparency & Trust  
**Status:** Proposed  
**Priority:** Next  
**Owner:** TBD

---

## Problem Statement

FanEngagement currently lacks comprehensive audit logging capabilities. While structured logging exists for proposal lifecycle transitions, webhook deliveries, and background services (as documented in `docs/architecture.md`), there is no dedicated audit trail system that:

1. **Tracks User Actions**: Who performed what action, when, and on which resources
2. **Records Authorization Decisions**: Failed access attempts, privilege escalations, role changes
3. **Provides Compliance Support**: Immutable records for regulatory or organizational auditing
4. **Enables Incident Investigation**: Clear traceability for security incidents or disputes
5. **Supports Multi-Organization Context**: Audit trails scoped to organizations with cross-org visibility for platform admins

**Current State:**

- Structured logging captures operational events (proposal transitions, webhook delivery)
- Correlation IDs track request flows
- No dedicated audit event storage or retrieval
- No user action attribution beyond basic logging
- No UI for reviewing audit trails
- No retention or export policies

**Why This Matters:**

- **Governance Trust**: Members need confidence that votes and proposal outcomes are recorded accurately
- **OrgAdmin Accountability**: Organizations need visibility into administrative actions
- **Platform Operations**: GlobalAdmins need to investigate incidents across organizations
- **Compliance Readiness**: Future regulatory requirements may mandate audit capabilities
- **Security Posture**: Detecting unauthorized access or suspicious patterns requires audit data

---

## Vision & Goals

**Strategic Intent:**

Transform FanEngagement into an auditable governance platform where every significant action is recorded, attributable, and reviewable—enabling trust, accountability, and compliance.

**Core Goals:**

1. **Comprehensive Coverage**: Capture all user-initiated actions affecting governance, membership, shares, and webhooks
2. **Clear Attribution**: Every audit event identifies who, what, when, where (org context), and how (API endpoint, session)
3. **Efficient Storage**: Design for scale—potentially millions of audit events across organizations
4. **Accessible Retrieval**: APIs and UIs for querying audit trails with filtering and pagination
5. **Security-First**: Audit logs must be tamper-resistant and protected from unauthorized access
6. **Minimal Performance Impact**: Audit logging should not significantly degrade application performance

---

## Scope

### In Scope

**A. Audit Event Capture**

- User authentication events (login, logout, token refresh, failed attempts)
- Authorization failures (403 responses, policy denials)
- User management (create, update, delete, role changes)
- Organization management (create, update, delete, branding changes)
- Membership management (add, remove, role changes)
- Share type management (create, update, delete)
- Share issuance and balance changes
- Proposal lifecycle (create, update, open, close, finalize, delete options)
- Vote casting
- Webhook management (create, update, delete)
- Admin actions (seed data, reset data, cleanup)

**B. Audit Event Storage**

- Dedicated audit event table/storage
- Immutable event records (append-only)
- Efficient indexing for common queries
- Configurable retention policies

**C. Audit Event Retrieval**

- REST API endpoints for querying audit events
- Filtering by: organization, user, action type, date range, resource type/ID
- Pagination for large result sets
- Export capability (CSV, JSON)

**D. Audit Event UI**

- OrgAdmin view: audit events for their organization
- PlatformAdmin view: audit events across all organizations
- Search, filter, and date range selection
- Event detail expansion

**E. Architecture & Documentation**

- Audit logging architecture design document
- Data flow diagrams
- Schema specifications
- Operational runbooks
- Developer guide for adding new audit events

**F. Testing**

- Unit tests for audit service
- Integration tests for audit event capture
- Performance tests for audit queries at scale
- Security tests for audit log access controls

### Out of Scope (Future Enhancements)

- Real-time audit streaming (webhooks for audit events)
- Blockchain commitment of audit events
- Advanced analytics/anomaly detection on audit data
- Audit log archival to cold storage
- SIEM integration

---

## Target Users / Roles

| Role | Primary Use Case |
|------|------------------|
| **OrgAdmin** | Review actions taken within their organization, investigate member disputes, demonstrate governance integrity |
| **GlobalAdmin** | Cross-organization incident investigation, compliance audits, platform-wide security monitoring |
| **Member** | View their own action history (limited scope) |
| **External Auditor** | Export and analyze audit data for compliance verification |

---

## Success Signals

- 100% of defined auditable actions are captured
- Audit queries return in <500ms for typical page sizes (50 events)
- Zero performance degradation (>5%) on audited operations
- OrgAdmins can answer "who changed X" questions within 2 minutes
- Audit data survives application restarts and deployments
- Security review confirms audit logs are tamper-resistant

---

## Story Breakdown

### Group 1: Architecture & Design Stories

#### Story E-005-01

> As an **architect**, I want to **design the audit logging data model**, so that **we have a clear schema for capturing audit events**.

**Status:** Proposed  
**Priority:** Now

##### Acceptance Criteria

- [ ] Define `AuditEvent` entity with fields:
  - `Id` (GUID, primary key)
  - `Timestamp` (UTC datetime, indexed)
  - `ActorUserId` (GUID, nullable—system actions have no actor)
  - `ActorDisplayName` (denormalized for query without joins)
  - `ActorIpAddress` (string, nullable)
  - `ActionType` (enum: Created, Updated, Deleted, Accessed, etc.)
  - `ResourceType` (enum: User, Organization, Membership, ShareType, Proposal, Vote, etc.)
  - `ResourceId` (GUID)
  - `ResourceName` (denormalized, e.g., proposal title)
  - `OrganizationId` (GUID, nullable—some actions are platform-level)
  - `OrganizationName` (denormalized)
  - `Details` (JSON, flexible structure for action-specific data)
  - `CorrelationId` (string, links to request correlation ID)
  - `Outcome` (enum: Success, Failure, Denied)
  - `FailureReason` (string, nullable)
- [ ] Define indexing strategy for common query patterns
- [ ] Document retention and archival strategy
- [ ] Produce data model design document in `docs/audit/`

##### Notes for Implementation

- Architecture/design task
- Consider using JSONB for `Details` in PostgreSQL for flexible querying
- Plan for high write throughput

---

#### Story E-005-02

> As an **architect**, I want to **design the audit service architecture**, so that **audit logging is well-encapsulated and minimally invasive**.

**Status:** Proposed  
**Priority:** Now

##### Acceptance Criteria

- [ ] Define `IAuditService` interface with methods:
  - `LogAsync(AuditEvent event)`
  - `LogAsync(AuditEventBuilder builder)` (fluent API)
  - `QueryAsync(AuditQuery query)` → `PagedResult<AuditEvent>`
- [ ] Define synchronous vs. asynchronous logging approach:
  - Option A: Synchronous (within transaction)
  - Option B: Asynchronous (queue + background worker)
  - Recommend approach with tradeoffs
- [ ] Define integration points:
  - Service layer (explicit calls)
  - Middleware/interceptors (automatic capture)
  - Combination approach
- [ ] Define error handling (audit failures should not fail business operations)
- [ ] Produce service architecture document

##### Notes for Implementation

- Consider existing structured logging patterns as foundation
- Evaluate MediatR behaviors for automatic audit capture
- Balance completeness vs. performance

---

#### Story E-005-03

> As an **architect**, I want to **define the audit event categorization**, so that **events are consistently classified and queryable**.

**Status:** Proposed  
**Priority:** Now

##### Acceptance Criteria

- [ ] Define `ActionType` enum values:
  - `Created`, `Updated`, `Deleted`, `Accessed`, `StatusChanged`, `RoleChanged`, `Exported`, `Authenticated`, `AuthorizationDenied`
- [ ] Define `ResourceType` enum values:
  - `User`, `Organization`, `Membership`, `ShareType`, `ShareIssuance`, `ShareBalance`, `Proposal`, `ProposalOption`, `Vote`, `WebhookEndpoint`, `OutboundEvent`, `SystemConfiguration`
- [ ] Define `Outcome` enum values:
  - `Success`, `Failure`, `Denied`, `Partial`
- [ ] Document which actions map to which categories
- [ ] Create categorization matrix document

##### Notes for Implementation

- Extensible design for future event types
- Consider whether to capture read operations (high volume)

---

### Group 2: Infrastructure & Backend Implementation Stories

#### Story E-005-04

> As a **developer**, I want to **create the audit event database schema**, so that **audit events can be persisted**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Create EF Core entity `AuditEvent` with all defined fields
- [ ] Create EF Core migration for `AuditEvents` table
- [ ] Add indexes on:
  - `Timestamp` (for date range queries)
  - `OrganizationId` (for org-scoped queries)
  - `ActorUserId` (for user action queries)
  - `ResourceType, ResourceId` (for resource history)
  - `ActionType` (for filtering)
- [ ] Configure `Details` as JSONB column (PostgreSQL)
- [ ] Test migration up and down
- [ ] Document table schema

##### Notes for Implementation

- Coding Agent task
- Follow existing migration patterns
- Consider table partitioning for future scale

---

#### Story E-005-05

> As a **developer**, I want to **implement the audit service**, so that **application code can log audit events**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Create `IAuditService` interface in Application layer
- [ ] Create `AuditService` implementation in Infrastructure layer
- [ ] Implement fluent `AuditEventBuilder` for easy event construction
- [ ] Support both synchronous and fire-and-forget logging modes
- [ ] Include structured logging of audit events (for correlation)
- [ ] Register service in dependency injection
- [ ] Handle and log audit service failures gracefully
- [ ] Add unit tests with mocked DbContext
- [ ] Add integration tests verifying persistence

##### Notes for Implementation

- Coding Agent task
- Pattern similar to existing `IOutboundEventService`
- Consider using a background channel for async writes

---

#### Story E-005-06

> As a **developer**, I want to **capture audit events for user management actions**, so that **user lifecycle changes are tracked**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Audit: User created (registration)
- [ ] Audit: User updated (profile changes)
- [ ] Audit: User deleted
- [ ] Audit: User role changed (privilege escalation tracking)
- [ ] Include relevant details:
  - Changed fields (before/after for updates)
  - Role transitions
- [ ] Integration tests verifying audit events are created
- [ ] No performance degradation on user operations

##### Notes for Implementation

- Coding Agent task
- Modify `UsersController` or `IUserService`
- Sensitive fields (password) should NOT be logged

---

#### Story E-005-07

> As a **developer**, I want to **capture audit events for authentication**, so that **login patterns and failures are tracked**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Audit: Successful login (token issued)
- [ ] Audit: Failed login attempt (invalid credentials)
- [ ] Audit: Token refresh
- [ ] Audit: Logout (if implemented)
- [ ] Include relevant details:
  - IP address
  - User agent
  - Failure reason (without exposing security details)
- [ ] Rate-limit protection for audit writes on repeated failures
- [ ] Integration tests for authentication audit events

##### Notes for Implementation

- Coding Agent task
- Modify `AuthController` or authentication service
- Be careful not to log sensitive credential data

---

#### Story E-005-08

> As a **developer**, I want to **capture audit events for authorization failures**, so that **access control issues are trackable**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Audit: 403 Forbidden responses
- [ ] Audit: Policy authorization failures
- [ ] Include relevant details:
  - Requested resource and action
  - User's current roles/memberships
  - Policy that denied access
- [ ] Create middleware or authorization handler to capture these events
- [ ] Avoid logging sensitive request bodies
- [ ] Integration tests for authorization failure auditing

##### Notes for Implementation

- Coding Agent task
- Consider creating an `AuditingAuthorizationMiddleware`
- Balance security (logging access patterns) vs. privacy

---

#### Story E-005-09

> As a **developer**, I want to **capture audit events for organization management**, so that **organization changes are tracked**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Audit: Organization created
- [ ] Audit: Organization updated (including branding changes)
- [ ] Audit: Organization deleted (if supported)
- [ ] Include relevant details:
  - Changed fields
  - Creator information
- [ ] Integration tests

##### Notes for Implementation

- Coding Agent task
- Modify `OrganizationsController` or `IOrganizationService`

---

#### Story E-005-10

> As a **developer**, I want to **capture audit events for membership management**, so that **membership changes are tracked**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Audit: Member added to organization
- [ ] Audit: Member removed from organization
- [ ] Audit: Member role changed (Member ↔ OrgAdmin)
- [ ] Include relevant details:
  - Target user
  - Role assignment
  - Acting admin
- [ ] Flag privilege escalation events
- [ ] Integration tests

##### Notes for Implementation

- Coding Agent task
- Critical for security auditing

---

#### Story E-005-11

> As a **developer**, I want to **capture audit events for share management**, so that **share issuance and type changes are tracked**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Audit: Share type created
- [ ] Audit: Share type updated
- [ ] Audit: Share type deleted
- [ ] Audit: Shares issued to user
- [ ] Include relevant details:
  - Quantity issued
  - Recipient user
  - Share type details
- [ ] Integration tests

##### Notes for Implementation

- Coding Agent task
- Important for governance integrity

---

#### Story E-005-12

> As a **developer**, I want to **capture audit events for proposal lifecycle**, so that **proposal governance is fully auditable**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Audit: Proposal created
- [ ] Audit: Proposal updated
- [ ] Audit: Proposal opened (Draft → Open)
- [ ] Audit: Proposal closed (Open → Closed)
- [ ] Audit: Proposal finalized (Closed → Finalized)
- [ ] Audit: Proposal option added
- [ ] Audit: Proposal option deleted
- [ ] Include relevant details:
  - Status transitions
  - Results (when closed)
  - Eligible voting power snapshot
- [ ] Integration tests

##### Notes for Implementation

- Coding Agent task
- Builds on existing structured logging

---

#### Story E-005-13

> As a **developer**, I want to **capture audit events for voting**, so that **vote activity is tracked**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Audit: Vote cast
- [ ] Include relevant details:
  - Voter (user ID, anonymized if required)
  - Proposal
  - Selected option
  - Voting power used
- [ ] Consider privacy implications (configurable anonymization)
- [ ] Integration tests

##### Notes for Implementation

- Coding Agent task
- Balance transparency vs. privacy
- May need organization-level configuration

---

#### Story E-005-14

> As a **developer**, I want to **capture audit events for webhook management**, so that **integration changes are tracked**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Audit: Webhook endpoint created
- [ ] Audit: Webhook endpoint updated
- [ ] Audit: Webhook endpoint deleted
- [ ] Audit: Outbound event retry triggered
- [ ] Include relevant details:
  - Endpoint URL (partial, for security)
  - Subscribed events
  - Changes made
- [ ] Do NOT log webhook secrets
- [ ] Integration tests

##### Notes for Implementation

- Coding Agent task
- Security-sensitive area

---

#### Story E-005-15

> As a **developer**, I want to **capture audit events for admin actions**, so that **platform administration is tracked**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Audit: Dev data seeded
- [ ] Audit: Data reset triggered
- [ ] Audit: E2E cleanup performed
- [ ] Include relevant details:
  - Admin user
  - Action parameters
- [ ] Restrict to development/demo environments where applicable
- [ ] Integration tests

##### Notes for Implementation

- Coding Agent task
- Important for security and compliance

---

### Group 3: API & Query Implementation Stories

#### Story E-005-16

> As a **developer**, I want to **create audit query API endpoints**, so that **audit events can be retrieved programmatically**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Create `GET /organizations/{orgId}/audit-events` endpoint:
  - Requires OrgAdmin role or GlobalAdmin
  - Supports filtering: actionType, resourceType, resourceId, actorUserId, dateFrom, dateTo
  - Supports pagination: page, pageSize
  - Returns `PagedResult<AuditEventDto>`
- [ ] Create `GET /admin/audit-events` endpoint for GlobalAdmin:
  - Cross-organization query capability
  - Additional filter: organizationId
- [ ] Create `GET /users/me/audit-events` endpoint:
  - Returns current user's own actions
  - Limited fields for privacy
- [ ] Add OpenAPI documentation for all endpoints
- [ ] Add authorization policy enforcement
- [ ] Integration tests for all endpoints

##### Notes for Implementation

- Coding Agent task
- Follow existing API patterns

---

#### Story E-005-17

> As a **developer**, I want to **implement audit event export**, so that **audit data can be extracted for compliance**.

**Status:** Proposed  
**Priority:** Later

##### Acceptance Criteria

- [ ] Create `GET /organizations/{orgId}/audit-events/export` endpoint:
  - Supports format: CSV, JSON
  - Applies same filters as query endpoint
  - Streams large exports efficiently
- [ ] Create `GET /admin/audit-events/export` for GlobalAdmin
- [ ] Add rate limiting to prevent abuse
- [ ] Audit the export action itself
- [ ] Integration tests

##### Notes for Implementation

- Coding Agent task
- Consider background job for very large exports

---

### Group 4: Frontend Implementation Stories

#### Story E-005-18

> As a **developer**, I want to **create the OrgAdmin audit log UI**, so that **organization admins can review audit events**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Create `/admin/organizations/:orgId/audit-log` page
- [ ] Display audit events in a table:
  - Timestamp
  - Actor
  - Action
  - Resource
  - Outcome
- [ ] Implement filtering controls:
  - Date range picker
  - Action type dropdown
  - Resource type dropdown
  - Search by actor or resource
- [ ] Implement pagination
- [ ] Add expandable row for event details (JSON viewer)
- [ ] Add loading, error, and empty states
- [ ] Add route guard for OrgAdmin role
- [ ] Add navigation item to org admin sidebar
- [ ] Add data-testid attributes for E2E testing

##### Notes for Implementation

- Coding Agent task
- Follow existing admin page patterns

---

#### Story E-005-19

> As a **developer**, I want to **create the PlatformAdmin audit log UI**, so that **global admins can review cross-organization audit events**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Create `/platform-admin/audit-log` page
- [ ] Include organization filter/selector
- [ ] Display audit events with organization context
- [ ] Implement same filtering and pagination as OrgAdmin view
- [ ] Add export button (triggers export endpoint)
- [ ] Add route guard for PlatformAdmin role
- [ ] Add navigation item to platform admin sidebar

##### Notes for Implementation

- Coding Agent task
- Consider performance for cross-org queries

---

#### Story E-005-20

> As a **developer**, I want to **create user action history view**, so that **members can see their own actions**.

**Status:** Proposed  
**Priority:** Later

##### Acceptance Criteria

- [ ] Create `/me/activity` page
- [ ] Display current user's audit events:
  - Recent votes
  - Profile changes
  - Membership changes
- [ ] Implement date filtering
- [ ] Simple list or timeline view
- [ ] Add to member navigation

##### Notes for Implementation

- Coding Agent task
- Privacy-focused: show only user's own actions

---

### Group 5: Documentation & Operations Stories

#### Story E-005-21

> As a **developer**, I want to **create audit logging documentation**, so that **the team understands the audit system**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Create `docs/audit/` directory
- [ ] Create `docs/audit/architecture.md`:
  - Audit data model diagram
  - Event capture flow
  - Storage and retention strategy
- [ ] Create `docs/audit/events.md`:
  - Comprehensive list of audited actions
  - Event details structure for each type
  - Examples
- [ ] Create `docs/audit/development.md`:
  - How to add new audit events
  - Testing audit events
  - Common patterns
- [ ] Create `docs/audit/operations.md`:
  - Retention configuration
  - Performance considerations
  - Troubleshooting
- [ ] Update `docs/architecture.md` with audit section reference

##### Notes for Implementation

- Coding Agent task (documentation)
- Follow existing documentation patterns

---

#### Story E-005-22

> As an **operator**, I want to **configure audit log retention**, so that **storage growth is managed**.

**Status:** Proposed  
**Priority:** Later

##### Acceptance Criteria

- [ ] Add configuration for retention period (days)
- [ ] Implement background job to purge old audit events
- [ ] Log purge operations
- [ ] Add configuration documentation
- [ ] Test retention with various configurations

##### Notes for Implementation

- Coding Agent task
- Consider archival before purge (future enhancement)

---

### Group 6: Testing Stories

#### Story E-005-23

> As a **developer**, I want to **create comprehensive audit logging tests**, so that **audit functionality is verified**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Unit tests for `AuditService`:
  - Event creation
  - Query filtering
  - Pagination
- [ ] Integration tests for audit capture:
  - All defined event types have test coverage
  - Verify event details are correct
- [ ] Integration tests for audit APIs:
  - Authorization enforcement
  - Filtering and pagination
- [ ] Performance tests:
  - Measure audit write overhead
  - Verify query performance at scale (100K+ events)
- [ ] E2E tests:
  - OrgAdmin can view audit log
  - PlatformAdmin cross-org query
  - Export functionality

##### Notes for Implementation

- Coding Agent task (testing)
- May need test data seeding for performance tests

---

#### Story E-005-24

> As a **security engineer**, I want to **verify audit log security**, so that **audit data is protected**.

**Status:** Proposed  
**Priority:** Next

##### Acceptance Criteria

- [ ] Verify audit logs are append-only (no update/delete APIs)
- [ ] Verify OrgAdmins can only query their organization's events
- [ ] Verify Members cannot access audit APIs (except own actions)
- [ ] Verify sensitive data is not logged:
  - No passwords
  - No webhook secrets
  - No full tokens
- [ ] Verify audit of audit access (meta-auditing)
- [ ] Security review sign-off

##### Notes for Implementation

- Security review task
- Part of overall security posture

---

## Dependencies

**Internal Dependencies:**

- Existing structured logging infrastructure
- Correlation ID middleware
- Authorization policies and roles
- EF Core and PostgreSQL

**External Dependencies:**

- None for MVP

**Skills/Knowledge Requirements:**

- EF Core migrations
- PostgreSQL JSONB querying
- React table/list components
- Security best practices for audit logging

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| High audit event volume impacts performance | High | Medium | Async writes, batching, efficient indexes |
| Audit log queries slow at scale | Medium | Medium | Proper indexing, pagination, query optimization |
| Sensitive data accidentally logged | High | Low | Code review, data classification, automated scanning |
| Audit log tampering | High | Low | Append-only design, access controls, integrity checks |
| Storage growth exceeds capacity | Medium | Medium | Retention policies, monitoring, archival strategy |

---

## Prioritization Guidance

1. **Now (Immediate):** Architecture stories (E-005-01 through E-005-03)
2. **Next (After Architecture):** Core implementation (E-005-04 through E-005-15), API (E-005-16), Frontend (E-005-18, E-005-19), Documentation (E-005-21), Testing (E-005-23, E-005-24)
3. **Later:** Export (E-005-17), User activity view (E-005-20), Retention (E-005-22)

---

## Sprint Planning Suggestions

- **Sprint 1:** Architecture & Design (E-005-01 through E-005-03)
- **Sprint 2-3:** Infrastructure & Core Implementation (E-005-04 through E-005-15)
- **Sprint 4:** API & Query Implementation (E-005-16)
- **Sprint 5:** Frontend Implementation (E-005-18, E-005-19)
- **Sprint 6:** Documentation, Testing, Security Review (E-005-21, E-005-23, E-005-24)
- **Sprint 7+:** Polish, Export, Retention (E-005-17, E-005-20, E-005-22)

---

## Technical Dependencies Chart

```
E-005-01 (Data Model Design)
    └── E-005-04 (Database Schema)
        └── E-005-05 (Audit Service)
            ├── E-005-06 (User Audit Events)
            ├── E-005-07 (Auth Audit Events)
            ├── E-005-08 (AuthZ Audit Events)
            ├── E-005-09 (Org Audit Events)
            ├── E-005-10 (Membership Audit Events)
            ├── E-005-11 (Share Audit Events)
            ├── E-005-12 (Proposal Audit Events)
            ├── E-005-13 (Vote Audit Events)
            ├── E-005-14 (Webhook Audit Events)
            └── E-005-15 (Admin Audit Events)

E-005-02 (Service Architecture)
    └── E-005-05 (Audit Service)
        └── E-005-16 (Query APIs)
            ├── E-005-17 (Export APIs)
            ├── E-005-18 (OrgAdmin UI)
            ├── E-005-19 (PlatformAdmin UI)
            └── E-005-20 (User Activity UI)

E-005-03 (Event Categorization)
    └── All event capture stories
```

---

## Success Metrics

- **Coverage:** 100% of defined actions generate audit events
- **Performance:** <10ms overhead per audited operation
- **Query Speed:** <500ms for typical audit queries (page size 50)
- **Availability:** Audit service does not cause business operation failures
- **Security:** Zero sensitive data exposure in audit logs
- **Usability:** OrgAdmins rate audit UI as "easy to use" in feedback
