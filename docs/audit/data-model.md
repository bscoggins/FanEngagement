# Audit Logging Data Model Design

> **Document Type:** Architecture Design  
> **Epic:** E-005 - Implement Thorough Audit Logging Across the Application  
> **Issue:** E-005-01  
> **Status:** Complete  
> **Last Updated:** November 2024

## Executive Summary

This document defines the audit logging data model for FanEngagement, establishing a clear schema for capturing audit events across the application. The design prioritizes comprehensive coverage, query efficiency, and scalability while leveraging PostgreSQL-specific features for flexible querying.

**Key Design Decisions:**

1. **Denormalized entity fields** (ActorDisplayName, OrganizationName, ResourceName) avoid expensive joins for common queries
2. **JSONB Details column** provides flexibility for action-specific data while enabling PostgreSQL-native querying
3. **Composite indexes** optimize the most common access patterns (date range, organization, user, resource history)
4. **Immutable append-only design** ensures audit trail integrity
5. **Time-based partitioning strategy** enables efficient retention management and query performance at scale

---

## Table of Contents

1. [AuditEvent Entity Definition](#1-auditevent-entity-definition)
2. [Field Descriptions and Rationale](#2-field-descriptions-and-rationale)
3. [Enum Definitions](#3-enum-definitions)
4. [Indexing Strategy](#4-indexing-strategy)
5. [PostgreSQL-Specific Implementation](#5-postgresql-specific-implementation)
6. [Query Pattern Examples](#6-query-pattern-examples)
7. [Retention and Archival Strategy](#7-retention-and-archival-strategy)
8. [Performance Considerations](#8-performance-considerations)
9. [Security Considerations](#9-security-considerations)
10. [Migration Strategy](#10-migration-strategy)

---

## 1. AuditEvent Entity Definition

### 1.1 Entity Schema

```csharp
public class AuditEvent
{
    // Primary Key
    public Guid Id { get; set; }
    
    // Timestamp
    public DateTime Timestamp { get; set; }
    
    // Actor Information (who performed the action)
    public Guid? ActorUserId { get; set; }
    public string? ActorDisplayName { get; set; }
    public string? ActorIpAddress { get; set; }
    
    // Action Classification
    public ActionType ActionType { get; set; }
    public Outcome Outcome { get; set; }
    public string? FailureReason { get; set; }
    
    // Resource Information (what was affected)
    public ResourceType ResourceType { get; set; }
    public Guid ResourceId { get; set; }
    public string? ResourceName { get; set; }
    
    // Organization Context
    public Guid? OrganizationId { get; set; }
    public string? OrganizationName { get; set; }
    
    // Additional Context
    public string? Details { get; set; }  // JSONB in PostgreSQL
    public string? CorrelationId { get; set; }
}
```

### 1.2 Database Table Definition

```sql
CREATE TABLE "AuditEvents" (
    "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "Timestamp" timestamp with time zone NOT NULL,
    
    -- Actor Information
    "ActorUserId" uuid NULL,
    "ActorDisplayName" varchar(200) NULL,
    "ActorIpAddress" varchar(45) NULL,  -- Supports IPv6
    
    -- Action Classification
    "ActionType" smallint NOT NULL,
    "Outcome" smallint NOT NULL,
    "FailureReason" varchar(1000) NULL,
    
    -- Resource Information
    "ResourceType" smallint NOT NULL,
    "ResourceId" uuid NOT NULL,
    "ResourceName" varchar(500) NULL,
    
    -- Organization Context
    "OrganizationId" uuid NULL,
    "OrganizationName" varchar(200) NULL,
    
    -- Additional Context
    "Details" jsonb NULL,
    "CorrelationId" varchar(100) NULL,
    
    CONSTRAINT "PK_AuditEvents" PRIMARY KEY ("Id")
);
```

---

## 2. Field Descriptions and Rationale

### 2.1 Primary Key

| Field | Type | Description | Rationale |
|-------|------|-------------|-----------|
| `Id` | GUID | Unique identifier for the audit event | GUIDs enable distributed generation without coordination; prevents enumeration attacks |

### 2.2 Timestamp

| Field | Type | Description | Rationale |
|-------|------|-------------|-----------|
| `Timestamp` | DateTime (UTC) | When the event occurred | UTC ensures consistency across timezones; indexed for date range queries |

**Implementation Note:** Always store in UTC; convert to local timezone only at presentation layer.

### 2.3 Actor Information

| Field | Type | Nullable | Description | Rationale |
|-------|------|----------|-------------|-----------|
| `ActorUserId` | GUID | Yes | ID of the user who performed the action | Nullable for system-initiated actions (background jobs, scheduled tasks) |
| `ActorDisplayName` | string(200) | Yes | Display name at time of action | Denormalized to avoid joins and preserve historical name even if user is deleted |
| `ActorIpAddress` | string(45) | Yes | IP address of the actor | Supports IPv6 (max 45 chars); useful for security auditing and forensics |

**Why Denormalize ActorDisplayName?**
- **Performance:** Eliminates join to Users table on every audit query
- **Historical Accuracy:** Preserves the display name at the time of action (names can change)
- **Resilience:** Audit record remains meaningful even if user is deleted
- **GDPR Consideration:** Can be anonymized ("User #12345") if user requests deletion while preserving audit integrity

### 2.4 Action Classification

| Field | Type | Nullable | Description | Rationale |
|-------|------|----------|-------------|-----------|
| `ActionType` | enum (smallint) | No | Type of action performed | Categorizes actions for filtering and analysis |
| `Outcome` | enum (smallint) | No | Result of the action | Distinguishes success, failure, and denied attempts |
| `FailureReason` | string(1000) | Yes | Explanation for non-success outcomes | Provides context for debugging and incident investigation |

### 2.5 Resource Information

| Field | Type | Nullable | Description | Rationale |
|-------|------|----------|-------------|-----------|
| `ResourceType` | enum (smallint) | No | Type of resource affected | Enables filtering by entity type |
| `ResourceId` | GUID | No | ID of the affected resource | Links to the specific entity; always populated even for create actions |
| `ResourceName` | string(500) | Yes | Human-readable resource identifier | Denormalized for readability; e.g., proposal title, user email, org name |

**Why Denormalize ResourceName?**
- **Readability:** Audit logs are human-readable without requiring additional lookups
- **Historical Accuracy:** Preserves resource name at time of action (titles/names change)
- **Resilience:** Audit record remains meaningful even if resource is deleted

### 2.6 Organization Context

| Field | Type | Nullable | Description | Rationale |
|-------|------|----------|-------------|-----------|
| `OrganizationId` | GUID | Yes | Organization scope of the action | Nullable for platform-level actions (user registration, global admin actions) |
| `OrganizationName` | string(200) | Yes | Organization name at time of action | Denormalized for same reasons as ActorDisplayName |

**Null OrganizationId Examples:**
- User registration (no org context yet)
- Platform admin viewing all organizations
- System configuration changes
- Global admin actions

### 2.7 Additional Context

| Field | Type | Nullable | Description | Rationale |
|-------|------|----------|-------------|-----------|
| `Details` | JSONB | Yes | Action-specific structured data | Flexible schema for varying event types; PostgreSQL JSONB enables querying |
| `CorrelationId` | string(100) | Yes | Request correlation ID | Links to application logs for end-to-end tracing |

---

## 3. Enum Definitions

### 3.1 ActionType Enum

```csharp
public enum ActionType : short
{
    // Resource Lifecycle
    Created = 1,
    Updated = 2,
    Deleted = 3,
    
    // Access and Views
    Accessed = 10,
    Exported = 11,
    
    // Status and State Changes
    StatusChanged = 20,
    RoleChanged = 21,
    
    // Authentication and Authorization
    Authenticated = 30,
    AuthorizationDenied = 31,
    
    // Future extensibility: 100+ for custom/domain-specific actions
}
```

| Value | Name | Description | Example Use Cases |
|-------|------|-------------|-------------------|
| 1 | `Created` | New resource created | User registered, proposal created, share type defined |
| 2 | `Updated` | Existing resource modified | Profile updated, proposal edited, membership role changed |
| 3 | `Deleted` | Resource removed | User deleted, proposal option removed, webhook removed |
| 10 | `Accessed` | Resource read/viewed | Viewing audit logs, exporting data, viewing sensitive info |
| 11 | `Exported` | Data exported from system | CSV/JSON export of audit events, member list export |
| 20 | `StatusChanged` | Status transition occurred | Proposal Draft→Open, proposal Open→Closed |
| 21 | `RoleChanged` | User role was modified | Member→OrgAdmin, Admin→User |
| 30 | `Authenticated` | Authentication event | Login success, login failure, token refresh |
| 31 | `AuthorizationDenied` | Access denied by authorization | 403 responses, policy violations |

### 3.2 ResourceType Enum

```csharp
public enum ResourceType : short
{
    // Core Entities
    User = 1,
    Organization = 2,
    Membership = 3,
    
    // Share Management
    ShareType = 10,
    ShareIssuance = 11,
    ShareBalance = 12,
    
    // Governance
    Proposal = 20,
    ProposalOption = 21,
    Vote = 22,
    
    // Integrations
    WebhookEndpoint = 30,
    OutboundEvent = 31,
    
    // System
    SystemConfiguration = 100,
    
    // Future extensibility: 200+ for custom resources
}
```

| Value | Name | Description |
|-------|------|-------------|
| 1 | `User` | Platform user account |
| 2 | `Organization` | Organization/tenant entity |
| 3 | `Membership` | User-Organization membership relationship |
| 10 | `ShareType` | Share type definition within an organization |
| 11 | `ShareIssuance` | Record of shares issued to a user |
| 12 | `ShareBalance` | User's current balance of a share type |
| 20 | `Proposal` | Governance proposal |
| 21 | `ProposalOption` | Voting option within a proposal |
| 22 | `Vote` | Vote cast on a proposal |
| 30 | `WebhookEndpoint` | Registered webhook URL |
| 31 | `OutboundEvent` | Queued event for webhook delivery |
| 100 | `SystemConfiguration` | Platform-level settings |

### 3.3 Outcome Enum

```csharp
public enum Outcome : short
{
    Success = 1,
    Failure = 2,
    Denied = 3,
    Partial = 4,
}
```

| Value | Name | Description | Example |
|-------|------|-------------|---------|
| 1 | `Success` | Action completed successfully | Vote cast, proposal created |
| 2 | `Failure` | Action failed due to error | Database error, validation failure |
| 3 | `Denied` | Action blocked by authorization | 403 Forbidden, insufficient permissions |
| 4 | `Partial` | Action partially completed | Batch operation with some failures |

---

## 4. Indexing Strategy

### 4.1 Index Definitions

```sql
-- Primary access pattern: Date range queries (most common)
CREATE INDEX "IX_AuditEvents_Timestamp" 
    ON "AuditEvents" ("Timestamp" DESC);

-- Organization-scoped queries
CREATE INDEX "IX_AuditEvents_OrganizationId_Timestamp" 
    ON "AuditEvents" ("OrganizationId", "Timestamp" DESC)
    WHERE "OrganizationId" IS NOT NULL;

-- User action queries (who did what)
CREATE INDEX "IX_AuditEvents_ActorUserId_Timestamp" 
    ON "AuditEvents" ("ActorUserId", "Timestamp" DESC)
    WHERE "ActorUserId" IS NOT NULL;

-- Resource history queries (what happened to X)
CREATE INDEX "IX_AuditEvents_ResourceType_ResourceId_Timestamp" 
    ON "AuditEvents" ("ResourceType", "ResourceId", "Timestamp" DESC);

-- Action type filtering
CREATE INDEX "IX_AuditEvents_ActionType_Timestamp" 
    ON "AuditEvents" ("ActionType", "Timestamp" DESC);

-- Outcome filtering (for security monitoring)
CREATE INDEX "IX_AuditEvents_Outcome_Timestamp" 
    ON "AuditEvents" ("Outcome", "Timestamp" DESC)
    WHERE "Outcome" IN (2, 3);  -- Failure, Denied only

-- Correlation ID lookup (for debugging)
CREATE INDEX "IX_AuditEvents_CorrelationId" 
    ON "AuditEvents" ("CorrelationId")
    WHERE "CorrelationId" IS NOT NULL;
```

### 4.2 Index Justification

| Index | Query Pattern | Expected Usage |
|-------|--------------|----------------|
| `IX_AuditEvents_Timestamp` | "Show all events in last 24 hours" | Most common; admin dashboards, recent activity |
| `IX_AuditEvents_OrganizationId_Timestamp` | "Show all events for Org X in last 7 days" | OrgAdmin audit review |
| `IX_AuditEvents_ActorUserId_Timestamp` | "Show all actions by User Y" | User activity investigation |
| `IX_AuditEvents_ResourceType_ResourceId_Timestamp` | "Show history of Proposal Z" | Resource-specific audit trail |
| `IX_AuditEvents_ActionType_Timestamp` | "Show all role changes" | Compliance reporting |
| `IX_AuditEvents_Outcome_Timestamp` | "Show all authorization failures" | Security monitoring |
| `IX_AuditEvents_CorrelationId` | "Find all events for request ABC" | Debugging, incident investigation |

### 4.3 Index Considerations

**Partial Indexes:** Used where appropriate to reduce index size:
- `OrganizationId IS NOT NULL` - Platform-level events don't need org index
- `ActorUserId IS NOT NULL` - System events don't need actor index
- `Outcome IN (2, 3)` - Success events (majority) don't need outcome index

**DESC Ordering:** All timestamp-inclusive indexes use DESC to optimize "most recent first" queries.

**Write Impact:** Six indexes will have a small write overhead (~5-10% per insert). Given audit events are append-only with no updates, this is acceptable.

---

## 5. PostgreSQL-Specific Implementation

### 5.1 JSONB Details Column

The `Details` column uses PostgreSQL's JSONB type for flexible, queryable structured data.

**Benefits:**
- Native JSON querying with operators (`->`, `->>`, `@>`, `?`)
- Automatic GIN indexing support for JSON paths
- Compression and efficient storage
- No schema migration needed for new detail fields

**Example Details Structures:**

**User Created:**
```json
{
  "email": "user@example.com",
  "initialRole": "User",
  "registrationSource": "web"
}
```

**Proposal Status Changed:**
```json
{
  "previousStatus": "Draft",
  "newStatus": "Open",
  "eligibleVotingPowerSnapshot": 15000.0,
  "optionCount": 3
}
```

**Vote Cast:**
```json
{
  "optionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "optionText": "Option A",
  "votingPower": 150.0
}
```

**Authorization Denied:**
```json
{
  "endpoint": "/organizations/{orgId}/proposals",
  "method": "POST",
  "requiredRole": "OrgAdmin",
  "actualRole": "Member",
  "policy": "RequireOrgAdmin"
}
```

**Membership Role Changed:**
```json
{
  "targetUserId": "user-guid",
  "targetUserDisplayName": "John Doe",
  "previousRole": "Member",
  "newRole": "OrgAdmin"
}
```

### 5.2 JSONB Indexing (Optional)

For frequently queried JSON paths, add GIN indexes:

```sql
-- Index for querying by previous/new status in details
CREATE INDEX "IX_AuditEvents_Details_Status" 
    ON "AuditEvents" USING GIN (("Details" -> 'newStatus'))
    WHERE "ActionType" = 20;  -- StatusChanged only

-- Index for querying voting power in vote events
CREATE INDEX "IX_AuditEvents_Details_VotingPower" 
    ON "AuditEvents" (("Details" ->> 'votingPower')::numeric)
    WHERE "ResourceType" = 22;  -- Vote only
```

**Recommendation:** Add GIN indexes only after identifying specific query patterns in production. Start without JSON indexes and monitor query performance.

### 5.3 EF Core Configuration

```csharp
public class AuditEventConfiguration : IEntityTypeConfiguration<AuditEvent>
{
    public void Configure(EntityTypeBuilder<AuditEvent> builder)
    {
        builder.ToTable("AuditEvents");
        
        builder.HasKey(e => e.Id);
        
        builder.Property(e => e.Timestamp)
            .IsRequired();
        
        builder.Property(e => e.ActorDisplayName)
            .HasMaxLength(200);
        
        builder.Property(e => e.ActorIpAddress)
            .HasMaxLength(45);
        
        builder.Property(e => e.ActionType)
            .IsRequired();
        
        builder.Property(e => e.Outcome)
            .IsRequired();
        
        builder.Property(e => e.FailureReason)
            .HasMaxLength(1000);
        
        builder.Property(e => e.ResourceType)
            .IsRequired();
        
        builder.Property(e => e.ResourceId)
            .IsRequired();
        
        builder.Property(e => e.ResourceName)
            .HasMaxLength(500);
        
        builder.Property(e => e.OrganizationName)
            .HasMaxLength(200);
        
        builder.Property(e => e.Details)
            .HasColumnType("jsonb");
        
        builder.Property(e => e.CorrelationId)
            .HasMaxLength(100);
        
        // Indexes defined in migration
    }
}
```

---

## 6. Query Pattern Examples

### 6.1 Organization-Scoped Queries

**"Show all actions in Organization X in the last 7 days"**
```sql
SELECT * FROM "AuditEvents"
WHERE "OrganizationId" = @orgId
  AND "Timestamp" >= @startDate
ORDER BY "Timestamp" DESC
LIMIT 50 OFFSET 0;
```

**"Show all failed actions in Organization X"**
```sql
SELECT * FROM "AuditEvents"
WHERE "OrganizationId" = @orgId
  AND "Outcome" IN (2, 3)  -- Failure, Denied
ORDER BY "Timestamp" DESC;
```

### 6.2 User Action Queries

**"Show all actions by User Y"**
```sql
SELECT * FROM "AuditEvents"
WHERE "ActorUserId" = @userId
ORDER BY "Timestamp" DESC
LIMIT 50;
```

**"Show all role changes performed by User Y"**
```sql
SELECT * FROM "AuditEvents"
WHERE "ActorUserId" = @userId
  AND "ActionType" = 21  -- RoleChanged
ORDER BY "Timestamp" DESC;
```

### 6.3 Resource History Queries

**"Show history for Proposal Z"**
```sql
SELECT * FROM "AuditEvents"
WHERE "ResourceType" = 20  -- Proposal
  AND "ResourceId" = @proposalId
ORDER BY "Timestamp" DESC;
```

**"Show all votes cast on Proposal Z"**
```sql
SELECT * FROM "AuditEvents"
WHERE "ResourceType" = 22  -- Vote
  AND "Details" ->> 'proposalId' = @proposalId::text
ORDER BY "Timestamp" DESC;
```

### 6.4 Security Monitoring Queries

**"Show all authorization failures in the last 24 hours"**
```sql
SELECT * FROM "AuditEvents"
WHERE "ActionType" = 31  -- AuthorizationDenied
  AND "Timestamp" >= NOW() - INTERVAL '24 hours'
ORDER BY "Timestamp" DESC;
```

**"Show all failed login attempts for User Y"**
```sql
SELECT * FROM "AuditEvents"
WHERE "ActionType" = 30  -- Authenticated
  AND "Outcome" = 2  -- Failure
  AND "Details" ->> 'email' = @userEmail
ORDER BY "Timestamp" DESC;
```

### 6.5 Compliance and Export Queries

**"Export all audit events for Organization X between dates"**
```sql
SELECT 
    "Timestamp",
    "ActorDisplayName",
    "ActionType",
    "ResourceType",
    "ResourceName",
    "Outcome",
    "Details"
FROM "AuditEvents"
WHERE "OrganizationId" = @orgId
  AND "Timestamp" BETWEEN @startDate AND @endDate
ORDER BY "Timestamp" ASC;
```

---

## 7. Retention and Archival Strategy

### 7.1 Retention Tiers

| Tier | Duration | Data Location | Use Case |
|------|----------|---------------|----------|
| **Hot** | 0-90 days | Primary PostgreSQL | Active querying, recent audit review |
| **Warm** | 90 days - 1 year | Primary PostgreSQL (partitioned) | Compliance queries, investigations |
| **Cold** | 1-7 years | Archive storage (optional) | Regulatory compliance, legal holds |
| **Purge** | >7 years | Deleted | Storage management |

### 7.2 Default Retention Configuration

```json
{
  "AuditRetention": {
    "HotRetentionDays": 90,
    "WarmRetentionDays": 365,
    "ArchiveEnabled": false,
    "ArchiveConnectionString": null,
    "PurgeAfterDays": 2555  // 7 years
  }
}
```

### 7.3 Retention Implementation Strategy

**Phase 1 (MVP):** Simple time-based deletion
- Background job runs daily
- Deletes events older than `PurgeAfterDays`
- Logs deletion count for audit purposes

```csharp
// Pseudo-code for retention job
public async Task ExecuteAsync(CancellationToken ct)
{
    var cutoffDate = DateTime.UtcNow.AddDays(-config.PurgeAfterDays);
    var deletedCount = await dbContext.AuditEvents
        .Where(e => e.Timestamp < cutoffDate)
        .ExecuteDeleteAsync(ct);
    
    logger.LogInformation("Purged {Count} audit events older than {Cutoff}", 
        deletedCount, cutoffDate);
}
```

**Phase 2 (Future):** Table partitioning for efficient retention
- Partition by month or quarter
- Drop entire partitions instead of row-by-row deletion
- Significantly improves retention job performance

### 7.4 Compliance Considerations

| Regulation | Typical Requirement | Recommendation |
|------------|---------------------|----------------|
| **GDPR** | Right to erasure (with exceptions for legal compliance) | Anonymize actor info; retain event for compliance |
| **SOX** | 7-year retention for financial records | Default 7-year purge |
| **HIPAA** | 6-year retention for healthcare | Configure per-organization |
| **PCI-DSS** | 1-year readily available | Hot + Warm tier covers this |

### 7.5 Legal Hold Support

For litigation or investigation holds:

```sql
-- Add legal_hold column (future enhancement)
ALTER TABLE "AuditEvents" ADD COLUMN "LegalHold" boolean DEFAULT false;

-- Modify retention job to exclude held events
DELETE FROM "AuditEvents"
WHERE "Timestamp" < @cutoffDate
  AND "LegalHold" = false;
```

---

## 8. Performance Considerations

### 8.1 Write Performance

**Expected Load:**
- ~10-50 audit events per API request (varies by action complexity)
- Peak: 1000 requests/minute → 10,000-50,000 events/minute
- Daily: 1-5 million events

**Optimization Strategies:**

1. **Async Write Pattern:** Fire-and-forget audit writes to avoid blocking business operations
   ```csharp
   // Audit service queues event; background worker persists
   auditService.LogAsync(event);  // Returns immediately
   ```

2. **Batch Inserts:** Buffer events and insert in batches
   - Buffer size: 100 events or 1 second timeout
   - Single INSERT with multiple VALUES

3. **Connection Pooling:** Dedicated connection pool for audit writes
   - Prevents audit load from affecting main application queries

### 8.2 Read Performance

**Optimization Strategies:**

1. **Pagination Required:** All list queries must use LIMIT/OFFSET or keyset pagination
2. **Index-Only Scans:** Cover common query patterns with appropriate indexes
3. **Query Timeout:** Set 30-second timeout on audit queries to prevent runaway queries
4. **Result Caching:** Cache aggregated dashboard metrics (event counts by type/day)

### 8.3 Storage Estimates

| Scale | Events/Year | Avg Event Size | Annual Storage |
|-------|-------------|----------------|----------------|
| Small | 1 million | 1 KB | ~1 GB |
| Medium | 10 million | 1 KB | ~10 GB |
| Large | 100 million | 1 KB | ~100 GB |

**With 7-year retention:**
- Small: ~7 GB
- Medium: ~70 GB
- Large: ~700 GB

### 8.4 Scaling Strategy

**Vertical Scaling (Phase 1):**
- Increase PostgreSQL resources
- Add read replicas for audit queries
- Tune shared_buffers and work_mem

**Horizontal Scaling (Future):**
- Table partitioning by month
- Separate audit database instance
- Consider TimescaleDB for time-series optimizations

---

## 9. Security Considerations

### 9.1 Access Control

| Role | Permissions |
|------|-------------|
| **Application Service** | INSERT only (append) |
| **OrgAdmin** | SELECT on org-scoped events only |
| **GlobalAdmin** | SELECT on all events |
| **Database Admin** | Full access (restricted, audited separately) |

### 9.2 Data Protection

**Sensitive Data Handling:**

| Data Type | Treatment |
|-----------|-----------|
| Passwords | NEVER logged |
| Tokens/Secrets | NEVER logged |
| Webhook secrets | NEVER logged |
| Email addresses | Logged (consider hashing for high-security) |
| IP addresses | Logged (configurable anonymization) |
| Vote choices | Logged (consider org-level privacy config) |

### 9.3 Integrity Protection

1. **Append-Only Design:** No UPDATE or DELETE operations from application code
2. **No Foreign Keys:** Audit table has no FK constraints (prevents cascade deletes)
3. **Immutable Records:** Once written, events cannot be modified
4. **Database Audit:** PostgreSQL audit logging on AuditEvents table itself

### 9.4 GDPR Compliance

**Right to Erasure Handling:**

When a user requests deletion:
1. User account is deleted/anonymized
2. Audit events are anonymized (not deleted):
   - `ActorDisplayName` → "Deleted User"
   - `ActorUserId` → retained (for integrity)
   - `Details` → sensitive PII removed

```sql
-- Anonymize user's audit footprint
UPDATE "AuditEvents"
SET "ActorDisplayName" = 'Deleted User',
    "Details" = "Details" - 'email' - 'ipAddress'
WHERE "ActorUserId" = @deletedUserId;
```

---

## 10. Migration Strategy

### 10.1 Initial Migration

```csharp
public partial class AddAuditEventsTable : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "AuditEvents",
            columns: table => new
            {
                Id = table.Column<Guid>(nullable: false, defaultValueSql: "gen_random_uuid()"),
                Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                ActorUserId = table.Column<Guid>(nullable: true),
                ActorDisplayName = table.Column<string>(maxLength: 200, nullable: true),
                ActorIpAddress = table.Column<string>(maxLength: 45, nullable: true),
                ActionType = table.Column<short>(nullable: false),
                Outcome = table.Column<short>(nullable: false),
                FailureReason = table.Column<string>(maxLength: 1000, nullable: true),
                ResourceType = table.Column<short>(nullable: false),
                ResourceId = table.Column<Guid>(nullable: false),
                ResourceName = table.Column<string>(maxLength: 500, nullable: true),
                OrganizationId = table.Column<Guid>(nullable: true),
                OrganizationName = table.Column<string>(maxLength: 200, nullable: true),
                Details = table.Column<string>(type: "jsonb", nullable: true),
                CorrelationId = table.Column<string>(maxLength: 100, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AuditEvents", x => x.Id);
            });

        // Create indexes
        migrationBuilder.CreateIndex(
            name: "IX_AuditEvents_Timestamp",
            table: "AuditEvents",
            column: "Timestamp",
            descending: new[] { true });

        migrationBuilder.CreateIndex(
            name: "IX_AuditEvents_OrganizationId_Timestamp",
            table: "AuditEvents",
            columns: new[] { "OrganizationId", "Timestamp" },
            descending: new[] { false, true },
            filter: "\"OrganizationId\" IS NOT NULL");

        migrationBuilder.CreateIndex(
            name: "IX_AuditEvents_ActorUserId_Timestamp",
            table: "AuditEvents",
            columns: new[] { "ActorUserId", "Timestamp" },
            descending: new[] { false, true },
            filter: "\"ActorUserId\" IS NOT NULL");

        migrationBuilder.CreateIndex(
            name: "IX_AuditEvents_ResourceType_ResourceId_Timestamp",
            table: "AuditEvents",
            columns: new[] { "ResourceType", "ResourceId", "Timestamp" },
            descending: new[] { false, false, true });

        migrationBuilder.CreateIndex(
            name: "IX_AuditEvents_ActionType_Timestamp",
            table: "AuditEvents",
            columns: new[] { "ActionType", "Timestamp" },
            descending: new[] { false, true });

        migrationBuilder.CreateIndex(
            name: "IX_AuditEvents_Outcome_Timestamp",
            table: "AuditEvents",
            columns: new[] { "Outcome", "Timestamp" },
            descending: new[] { false, true },
            filter: "\"Outcome\" IN (2, 3)");

        migrationBuilder.CreateIndex(
            name: "IX_AuditEvents_CorrelationId",
            table: "AuditEvents",
            column: "CorrelationId",
            filter: "\"CorrelationId\" IS NOT NULL");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "AuditEvents");
    }
}
```

### 10.2 Rollback Considerations

- **Safe Rollback:** Dropping AuditEvents table loses all audit data
- **Recommendation:** Before rolling back, export audit data to backup
- **No FK Dependencies:** AuditEvents has no foreign keys, so rollback doesn't affect other tables

---

## Appendix A: ActionType to Event Mapping

| Action | ActionType | ResourceType | Details Fields |
|--------|------------|--------------|----------------|
| User registration | Created | User | email, registrationSource |
| User profile update | Updated | User | changedFields |
| User deleted | Deleted | User | deletedBy |
| User role changed | RoleChanged | User | previousRole, newRole |
| Login success | Authenticated | User | ipAddress, userAgent |
| Login failure | Authenticated | User | email, failureReason |
| Authorization denied | AuthorizationDenied | (varies) | endpoint, method, policy |
| Organization created | Created | Organization | creatorId |
| Organization updated | Updated | Organization | changedFields |
| Membership added | Created | Membership | userId, role |
| Membership removed | Deleted | Membership | userId, removedBy |
| Membership role changed | RoleChanged | Membership | previousRole, newRole |
| Share type created | Created | ShareType | name, symbol, votingWeight |
| Shares issued | Created | ShareIssuance | quantity, recipientId |
| Proposal created | Created | Proposal | title |
| Proposal opened | StatusChanged | Proposal | previousStatus, newStatus, eligibleVotingPower |
| Proposal closed | StatusChanged | Proposal | previousStatus, newStatus, winningOptionId, quorumMet |
| Proposal finalized | StatusChanged | Proposal | previousStatus, newStatus |
| Option added | Created | ProposalOption | optionText |
| Option deleted | Deleted | ProposalOption | optionText |
| Vote cast | Created | Vote | optionId, votingPower |
| Webhook created | Created | WebhookEndpoint | url (partial), subscribedEvents |
| Webhook updated | Updated | WebhookEndpoint | changedFields |
| Webhook deleted | Deleted | WebhookEndpoint | url (partial) |
| Event retry | Updated | OutboundEvent | previousStatus, newStatus |
| Audit log viewed | Accessed | SystemConfiguration | queryFilters |
| Audit log exported | Exported | SystemConfiguration | format, dateRange |

---

## Appendix B: Sample Audit Event JSON

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "timestamp": "2024-11-15T14:32:00Z",
  "actorUserId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "actorDisplayName": "Alice Admin",
  "actorIpAddress": "192.168.1.100",
  "actionType": "StatusChanged",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "Proposal",
  "resourceId": "f0e9d8c7-b6a5-4321-0987-654321fedcba",
  "resourceName": "Q4 Budget Allocation",
  "organizationId": "11111111-2222-3333-4444-555555555555",
  "organizationName": "Manchester United Supporters Club",
  "details": {
    "previousStatus": "Open",
    "newStatus": "Closed",
    "totalVotesCast": 12500.5,
    "winningOptionId": "option-guid-here",
    "winningOptionText": "Approve Budget",
    "quorumMet": true,
    "quorumRequired": 50.0,
    "quorumAchieved": 62.5
  },
  "correlationId": "req-abc123-xyz789"
}
```

---

## References

### Related FanEngagement Documents

- [E-005 Audit Logging Epic](../product/archive/E-005-audit-logging.md) - Full epic definition and story breakdown
- [Architecture Overview](../architecture.md) - Current system architecture and domain model
- [Observability & Health](../architecture.md#observability--health) - Existing logging and metrics patterns to align with

### External Resources

- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [EF Core PostgreSQL Provider](https://www.npgsql.org/efcore/)
- [GDPR and Audit Logs](https://gdpr.eu/article-17-right-to-be-forgotten/) - Right to erasure guidance
