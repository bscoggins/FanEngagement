# Audit Logging Architecture

> **Document Type:** Architecture Overview  
> **Epic:** E-005 - Implement Thorough Audit Logging Across the Application  
> **Status:** Complete  
> **Last Updated:** December 3, 2024

## Executive Summary

The FanEngagement audit logging system provides comprehensive, tamper-proof logging of all significant user actions and system events across the platform. The audit system is designed to be:

- **Non-blocking:** Audit logging never fails or slows down business operations
- **Comprehensive:** Captures all user management, governance, authorization, and admin actions
- **Queryable:** Efficient filtering and searching by organization, user, resource, time, and outcome
- **Scalable:** Asynchronous persistence with configurable retention and archival
- **Secure:** Immutable append-only logs with privacy controls for user-facing queries

The system uses a hybrid synchronous/asynchronous architecture with channel-based buffering to ensure audit events are captured without impacting application performance.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Model](#data-model)
3. [Event Capture Flow](#event-capture-flow)
4. [Storage and Indexing Strategy](#storage-and-indexing-strategy)
5. [Retention and Archival Strategy](#retention-and-archival-strategy)
6. [Integration Points](#integration-points)
7. [Security and Privacy](#security-and-privacy)
8. [Performance Characteristics](#performance-characteristics)

---

## System Overview

### Architecture Diagram

```mermaid
graph TD
    A[Controllers/Services] -->|Explicit Logging| B[IAuditService]
    C[Authorization Middleware] -->|403 Capture| B
    D[Auth Service] -->|Login Events| B
    
    B -->|Queue Event| E[Bounded Channel<br/>Capacity: 1000]
    
    E -->|Batch Dequeue| F[Audit Persistence<br/>Background Service]
    
    F -->|Write| G[(PostgreSQL<br/>AuditEvents Table)]
    
    H[Audit Query APIs] -->|Read| G
    I[Audit Export APIs] -->|Stream| G
    
    J[Retention Service<br/>Daily @ 2 AM UTC] -->|Purge Old Events| G
    
    style B fill:#e1f5ff
    style E fill:#fff4e1
    style F fill:#e8f5e9
    style G fill:#f3e5f5
```

### Key Components

1. **IAuditService Interface**
   - Primary API for logging audit events
   - Provides `LogAsync()` for fire-and-forget logging
   - Provides `LogSyncAsync()` for transactional logging
   - Provides `QueryAsync()` for filtering and pagination
   - Provides `StreamEventsAsync()` for large exports

2. **AuditEventBuilder**
   - Fluent API for constructing audit events
   - Enforces required fields at build time
   - Handles JSON serialization of details
   - Truncates failure reasons to 1000 characters

3. **Bounded Channel**
   - In-memory queue for pending audit events
   - Capacity: 1000 events
   - Overflow strategy: Drop oldest on full channel (with warning logged)
   - Provides natural backpressure during high load

4. **Audit Persistence Background Service**
   - Dequeues events in batches (default: 10 events)
   - Persists to database asynchronously
   - Retry logic for transient database failures
   - Self-audits its own operations

5. **Audit Retention Background Service**
   - Runs on configurable schedule (default: daily @ 2 AM UTC)
   - Purges events older than retention period (default: 365 days, minimum: 30 days)
   - Batch deletion to avoid long-running transactions
   - Self-audits purge operations

---

## Data Model

### AuditEvent Entity

The core entity capturing all audit information:

```csharp
public class AuditEvent
{
    // Identity
    public Guid Id { get; set; }
    public DateTimeOffset Timestamp { get; set; }

    // Actor (Who?)
    public Guid? ActorUserId { get; set; }
    public string? ActorDisplayName { get; set; }
    public string? ActorIpAddress { get; set; }

    // Action (What?)
    public AuditActionType ActionType { get; set; }
    public AuditOutcome Outcome { get; set; }
    public string? FailureReason { get; set; }

    // Resource (On What?)
    public AuditResourceType ResourceType { get; set; }
    public Guid ResourceId { get; set; }
    public string? ResourceName { get; set; }

    // Organization Context (Where?)
    public Guid? OrganizationId { get; set; }
    public string? OrganizationName { get; set; }

    // Additional Context
    public string? Details { get; set; }          // JSONB in PostgreSQL
    public string? CorrelationId { get; set; }    // For request tracing

    // Navigation Properties
    public User? ActorUser { get; set; }
    public Organization? Organization { get; set; }
}
```

### Enumerations

See [Event Categorization Documentation](./event-categorization.md) for complete enum definitions.

**AuditActionType** - What action was performed:
- Resource Lifecycle: `Created`, `Updated`, `Deleted`
- Access: `Accessed`, `Exported`
- State Changes: `StatusChanged`, `RoleChanged`
- Authentication/Authorization: `Authenticated`, `AuthorizationDenied`
- Admin Operations: `AdminDataSeeded`, `AdminDataReset`, `AdminDataCleanup`

**AuditResourceType** - What resource was affected:
- Core Entities: `User`, `Organization`, `Membership`
- Share Management: `ShareType`, `ShareIssuance`, `ShareBalance`
- Governance: `Proposal`, `ProposalOption`, `Vote`
- Integrations: `WebhookEndpoint`, `OutboundEvent`
- System: `AuditEvent`, `SystemConfiguration`

**AuditOutcome** - Result of the action:
- `Success`: Action completed successfully
- `Failure`: Action failed due to error
- `Denied`: Action denied due to authorization
- `Partial`: Action partially succeeded

### Denormalized Fields

The following fields are denormalized for query performance:

- **ActorDisplayName**: Cached from `User.DisplayName` at event creation
- **OrganizationName**: Cached from `Organization.Name` at event creation
- **ResourceName**: Cached from entity's display name at event creation

**Rationale:** These fields avoid expensive JOINs when displaying audit logs. They represent a snapshot at the time of the event and do not change even if the underlying entity is updated later.

---

## Event Capture Flow

### Asynchronous Logging (Default)

Most audit events use fire-and-forget asynchronous logging:

```mermaid
sequenceDiagram
    participant Service
    participant IAuditService
    participant Channel
    participant BgService as Background Service
    participant DB as PostgreSQL

    Service->>IAuditService: LogAsync(event)
    IAuditService->>Channel: TryWrite(event)
    IAuditService-->>Service: Task completed (event queued)
    
    Note over Service: Business operation continues<br/>without waiting
    
    loop Every 100ms
        BgService->>Channel: Reader.ReadAsync()
        Channel-->>BgService: Batch of events
        BgService->>DB: INSERT batch
    end
```

**Flow:**
1. Service/Controller calls `auditService.LogAsync(builder)` or `auditService.LogAsync(event)`
2. `IAuditService` writes event to bounded channel
3. Method returns immediately (non-blocking)
4. Background service dequeues events in batches
5. Events are persisted to database asynchronously

**Error Handling:**
- If channel is full (1000 events), oldest event is dropped with warning
- Database failures are logged but do not propagate to callers
- Background service retries transient failures with exponential backoff

### Synchronous Logging (Critical Events)

For critical events that must be atomically committed with business data:

```mermaid
sequenceDiagram
    participant Service
    participant IAuditService
    participant DB as PostgreSQL

    Note over Service: Begin Transaction
    Service->>DB: INSERT Business Data
    Service->>IAuditService: LogSyncAsync(event)
    IAuditService->>DB: INSERT Audit Event<br/>(Same Transaction)
    IAuditService-->>Service: Task completed
    Note over Service: Commit Transaction
```

**Usage:** Reserved for events that must be recorded atomically with the business operation (e.g., critical governance actions).

---

## Storage and Indexing Strategy

### Database Schema

The `AuditEvents` table is stored in PostgreSQL with the following characteristics:

- **Primary Key:** `Id` (UUID)
- **JSONB Column:** `Details` for flexible structured data
- **Foreign Keys:** 
  - `ActorUserId` → `Users(Id)` (nullable, ON DELETE SET NULL)
  - `OrganizationId` → `Organizations(Id)` (nullable, ON DELETE SET NULL)

### Indexing Strategy

Indexes are designed to optimize the most common query patterns:

```sql
-- 1. Time-based queries (most common)
CREATE INDEX IX_AuditEvents_Timestamp_Desc 
ON AuditEvents (Timestamp DESC);

-- 2. Organization-scoped queries
CREATE INDEX IX_AuditEvents_OrganizationId_Timestamp 
ON AuditEvents (OrganizationId, Timestamp DESC) 
WHERE OrganizationId IS NOT NULL;

-- 3. User activity queries
CREATE INDEX IX_AuditEvents_ActorUserId_Timestamp 
ON AuditEvents (ActorUserId, Timestamp DESC) 
WHERE ActorUserId IS NOT NULL;

-- 4. Resource history queries
CREATE INDEX IX_AuditEvents_ResourceType_ResourceId_Timestamp 
ON AuditEvents (ResourceType, ResourceId, Timestamp DESC);

-- 5. Action type filtering
CREATE INDEX IX_AuditEvents_ActionType_Timestamp 
ON AuditEvents (ActionType, Timestamp DESC);

-- 6. JSONB GIN index for details queries (future enhancement)
-- CREATE INDEX IX_AuditEvents_Details_GIN ON AuditEvents USING gin (Details);
```

### Query Patterns

The audit API supports filtering by:
- **Date Range** (with required max range of 90 days for exports)
- **Organization ID** (for org-scoped queries)
- **Actor User ID** (for user activity history)
- **Resource Type + Resource ID** (for resource change history)
- **Action Types** (multiple via comma-separated list)
- **Outcome** (Success, Failure, Denied, Partial)

---

## Retention and Archival Strategy

### Automated Retention

See [Retention Configuration Documentation](./retention-configuration.md) for complete details.

**Default Settings:**
- **Retention Period:** 365 days
- **Minimum Retention:** 30 days (enforced by configuration validation)
- **Purge Schedule:** Daily at 2:00 AM UTC (configurable via cron expression)
- **Batch Size:** 1000 events per batch (prevents long-running transactions)

**Configuration:**

```json
{
  "AuditRetention": {
    "RetentionDays": 365,
    "PurgeSchedule": "0 2 * * *",
    "PurgeBatchSize": 1000
  }
}
```

### Archival Strategy (Future Enhancement)

For organizations requiring longer retention (e.g., 7 years for compliance), future enhancements will include:

1. **Cold Storage Export:** 
   - Export events older than hot retention period to S3/Azure Blob
   - Store in Parquet or JSON Lines format for analytics
   - Compress with gzip or snappy

2. **Partitioning by Month:**
   - PostgreSQL table partitioning by month
   - Drop old partitions instead of DELETE operations
   - Faster purges and easier backups

3. **Data Warehouse Integration:**
   - Stream events to Snowflake/BigQuery for analytics
   - Enable complex queries across years of data

---

## Integration Points

### Application Services

Services log audit events using `IAuditService` via dependency injection:

```csharp
public class UserService(
    ApplicationDbContext context,
    IAuditService auditService,
    ILogger<UserService> logger)
{
    public async Task<User> CreateUserAsync(CreateUserRequest request)
    {
        var user = new User { /* ... */ };
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        // Audit logging (fire-and-forget)
        await auditService.LogAsync(
            new AuditEventBuilder()
                .WithAction(AuditActionType.Created)
                .WithResource(AuditResourceType.User, user.Id, user.DisplayName)
                .WithDetails(new { user.Email, user.DisplayName, user.Role })
                .AsSuccess());

        return user;
    }
}
```

### Authorization Middleware

The `AuditingAuthorizationMiddleware` automatically captures all authorization failures (403 responses):

```csharp
app.UseAuthentication();
app.UseMiddleware<AuditingAuthorizationMiddleware>();  // Captures 403s
app.UseAuthorization();
```

**Captured Information:**
- User ID and display name
- IP address
- Request method and path
- User roles
- Correlation ID (if present in `X-Correlation-ID` header)

### Authentication Service

Login attempts (both successful and failed) are logged by `AuthService`:

```csharp
// Successful login
await auditService.LogAsync(
    new AuditEventBuilder()
        .WithAction(AuditActionType.Authenticated)
        .WithResource(AuditResourceType.User, user.Id, user.DisplayName)
        .WithIpAddress(context?.IpAddress)
        .WithCorrelationId(context?.CorrelationId)
        .AsSuccess());

// Failed login
await auditService.LogAsync(
    new AuditEventBuilder()
        .WithAction(AuditActionType.Authenticated)
        .WithResource(AuditResourceType.User, Guid.Empty, "Unknown")
        .WithIpAddress(context?.IpAddress)
        .AsFailure("Invalid credentials"));
```

### Admin Operations

The `AdminController` logs all administrative actions:

```csharp
await auditService.LogAsync(
    new AuditEventBuilder()
        .WithActor(userId, displayName)
        .WithAction(AuditActionType.AdminDataSeeded)
        .WithResource(AuditResourceType.SystemConfiguration, resourceId, "Seed Data")
        .WithDetails(new { 
            usersCreated = 5, 
            organizationsCreated = 2 
        })
        .AsSuccess());
```

---

## Security and Privacy

### Immutability

Audit events are **append-only** and **immutable**:
- No UPDATE or DELETE operations are allowed via application code
- Only automated retention service can purge old events
- Database-level constraints enforce immutability

### Privacy Controls

Different audit APIs have different privacy levels:

| API | Audience | Privacy Level | IP Addresses? |
|-----|----------|---------------|---------------|
| `GET /admin/audit-events` | GlobalAdmin | Full access to all fields | ✅ Yes |
| `GET /organizations/{id}/audit-events` | OrgAdmin | Organization-scoped | ✅ Yes |
| `GET /users/{id}/audit-events` | Individual User | User's own events only | ❌ No (filtered) |

**IP Address Filtering:**
- User-facing API (`/users/{id}/audit-events`) strips IP addresses for privacy
- Only admins (GlobalAdmin and OrgAdmin) can see IP addresses
- Implemented via `AuditEventUserDto` which excludes `ActorIpAddress`

### Sensitive Data Handling

**Passwords:** Never logged in audit details
**API Keys/Secrets:** Masked before logging (e.g., webhook secrets)
**Webhook URLs:** Partially masked (e.g., `https://****:****@example.com/webhook`)

Example from `WebhookEndpointService`:

```csharp
.WithDetails(new
{
    endpointUrl = MaskUrl(webhookEndpoint.Url),
    subscribedEvents = webhookEndpoint.SubscribedEvents
})
```

---

## Performance Characteristics

### Write Performance

- **Non-blocking:** Audit logging adds <1ms overhead to business operations
- **Throughput:** Handles 10,000+ events/second with default channel capacity
- **Batch Persistence:** Events are written in batches (default: 10 events per batch)
- **Backpressure:** Channel drops oldest events if queue fills (warning logged)

### Query Performance

- **Indexed Queries:** Sub-second response for filtered queries (with date range)
- **Full Table Scans:** Avoided via required date range filters on exports
- **Export Streaming:** Memory-efficient streaming for large exports (batches of 100)
- **Rate Limiting:** Export endpoints are rate-limited to prevent abuse

**Export Rate Limits:**
- **Per User:** 10 requests per 10 minutes
- **Per Organization:** 20 requests per 10 minutes

### Storage Growth

**Estimated Event Sizes:**
- Minimal event (no details): ~200 bytes
- Typical event with details: ~500 bytes
- Maximum event with full details: ~5 KB

**Growth Projections:**

| Active Users | Events/Day | Storage/Day | Storage/Year (365d retention) |
|--------------|------------|-------------|-------------------------------|
| 100 | 1,000 | 500 KB | ~180 MB |
| 1,000 | 10,000 | 5 MB | ~1.8 GB |
| 10,000 | 100,000 | 50 MB | ~18 GB |
| 100,000 | 1,000,000 | 500 MB | ~180 GB |

**Retention Impact:**
- 365-day retention: Full year of data
- 90-day retention: 25% storage reduction
- 30-day retention (minimum): 92% storage reduction

---

## Related Documentation

- **[Data Model Design](./data-model.md)** - Detailed entity schema, indexes, and PostgreSQL implementation
- **[Service Architecture](./service-architecture.md)** - IAuditService interface, component design, and sequence diagrams
- **[Event Categorization](./event-categorization.md)** - Complete ActionType, ResourceType, and Outcome enum definitions
- **[Retention Configuration](./retention-configuration.md)** - Automated purge configuration and monitoring
- **[Event Catalog](./events.md)** - Comprehensive list of all audited events by category
- **[Development Guide](./development.md)** - How to add new audit events and testing strategies
- **[Operations Guide](./operations.md)** - Production configuration, monitoring, and troubleshooting

---

## Future Enhancements

See [Future Improvements Documentation](../future-improvements.md) for a complete list of planned enhancements, including:

- Cold storage archival (S3/Azure Blob)
- Table partitioning by month
- Data warehouse streaming (Snowflake/BigQuery)
- GIN index on JSONB details for advanced queries
- Real-time audit event streaming via WebSockets
- Anomaly detection for security monitoring
