# Audit Logging Operations Guide

> **Document Type:** Operations Runbook  
> **Epic:** E-005 - Implement Thorough Audit Logging Across the Application  
> **Status:** Complete  
> **Last Updated:** December 3, 2024

## Executive Summary

This guide provides operations teams with everything needed to manage audit logging in production, including configuration, monitoring, performance tuning, and troubleshooting. The audit system is designed to be low-maintenance and self-managing, but this guide covers the operational aspects you need to know.

---

## Table of Contents

1. [Configuration](#configuration)
2. [Retention Management](#retention-management)
3. [Performance Tuning](#performance-tuning)
4. [Query Optimization](#query-optimization)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Backup and Recovery](#backup-and-recovery)
7. [Troubleshooting Common Issues](#troubleshooting-common-issues)
8. [Querying Audit Logs](#querying-audit-logs)
9. [Security and Compliance](#security-and-compliance)

---

## Configuration

### Application Settings

**Location:** `appsettings.json` or `appsettings.Production.json`

```json
{
  "Audit": {
    "ChannelCapacity": 1000,
    "BatchSize": 10,
    "BatchDequeueDelayMs": 100
  },
  "AuditRetention": {
    "RetentionDays": 365,
    "PurgeSchedule": "0 2 * * *",
    "PurgeBatchSize": 1000
  }
}
```

### Configuration Reference

#### Audit Options

| Setting | Default | Description | Recommended Range |
|---------|---------|-------------|-------------------|
| `ChannelCapacity` | 1000 | Maximum pending events in memory | 1000-10000 |
| `BatchSize` | 10 | Events per database batch | 10-100 |
| `BatchDequeueDelayMs` | 100 | Delay between batch dequeues | 50-500 |

#### Retention Options

| Setting | Default | Description | Constraints |
|---------|---------|-------------|-------------|
| `RetentionDays` | 365 | Days to keep audit events | Minimum: 30 |
| `PurgeSchedule` | "0 2 * * *" | Cron schedule for purge | Valid cron expression |
| `PurgeBatchSize` | 1000 | Events deleted per batch | 100-10000 |

### Environment Variables (Override)

For containerized deployments, override via environment variables:

```bash
# Docker / Kubernetes
AUDIT__CHANNELCAPACITY=5000
AUDIT__BATCHSIZE=50
AUDITRETENTION__RETENTIONDAYS=90
AUDITRETENTION__PURGESCHEDULE="0 3 * * *"
```

### Validation

Configuration is validated at startup. Check logs for warnings:

```
[Warning] Audit retention period is below minimum (30 days). Using minimum value.
[Info] Audit service configured: Channel=1000, Batch=10, Delay=100ms
[Info] Audit retention configured: Retention=365d, Schedule='0 2 * * *'
```

---

## Retention Management

### Understanding Retention

The audit retention system automatically purges old events based on the configured retention period. This prevents unbounded database growth while maintaining compliance requirements.

**Default Retention:** 365 days  
**Minimum Retention:** 30 days (enforced)  
**Purge Frequency:** Daily at 2:00 AM UTC (configurable)

### Retention Policy by Event Type

All event types follow the same retention policy. If you need different retention for specific events (e.g., 7 years for financial compliance), consider:

1. **Export to cold storage** before purge (see [Backup Strategy](#backup-strategy))
2. **Data warehouse integration** for long-term analytics
3. **Custom retention logic** (requires code changes)

### Manual Purge (Emergency)

If you need to manually purge old events outside the schedule:

```sql
-- Purge events older than 90 days
DELETE FROM "AuditEvents"
WHERE "Timestamp" < NOW() - INTERVAL '90 days'
LIMIT 1000;  -- Use LIMIT to avoid long-running transaction
```

**Warning:** Manual purges are not audited. Use the scheduled purge when possible.

### Monitoring Retention

**Key Metrics:**
- `audit_retention_purged_count` - Events purged per run
- `audit_retention_duration_seconds` - Time taken for purge
- `audit_retention_last_run` - Timestamp of last purge

**Logs to Monitor:**

```
[Info] Audit retention starting: Cutoff=2023-12-03, BatchSize=1000
[Info] Audit retention completed: Purged=5000 events, Duration=1.2s
```

### Retention Compliance

For compliance requirements (GDPR, SOX, HIPAA), document your retention policy:

**Example Policy:**

> "Audit events are retained for 365 days in the production database. Events older than 365 days are automatically purged daily at 2:00 AM UTC. For compliance, critical events (proposal finalization, vote records) are exported monthly to long-term cold storage with 7-year retention."

---

## Performance Tuning

### Channel Capacity and Overflow Handling

**Symptom:** Logs show "Audit channel full, dropping oldest event"

**Security Risk:** The current implementation uses a drop-oldest policy when the audit channel is full. This can be exploited by attackers flooding the system with audit-generating actions (e.g., repeated authorization denials, failed logins) to evict earlier, potentially incriminating events before they are persisted. Simply increasing `ChannelCapacity` is not sufficient to address this security concern.

**Recommended Solutions:**

1. **Implement Durable Overflow** (Highest Priority)
   - Use a disk-backed buffer to persist audit events when the in-memory channel is full
   - Ensures no events are lost even during high-load scenarios
   - Requires code changes to implement

2. **Prioritize Security-Critical Events**
   - Never drop critical events: authentication, authorization, proposal finalization, vote records
   - Lower-priority events (e.g., read operations) may be dropped only after all overflow options are exhausted
   - Requires code changes to implement priority queues

3. **Per-Actor Rate Limiting**
   - Apply rate limits to audit event generation per actor (user/service)
   - Generate alerts when limits are exceeded or drops occur
   - Prevents single actors from flooding the audit system
   - Requires code changes to implement

4. **Switch to Drop-Newest with Alerting**
   - Preserve already-enqueued events instead of dropping oldest
   - Set up monitoring and alerting for any dropped or overflowed audit events
   - Requires configuration changes

**Temporary Mitigation:**

Increasing `ChannelCapacity` can help with short-term spikes but does not address the fundamental security issue:

```json
{
  "Audit": {
    "ChannelCapacity": 5000  // Increase from default 1000 (temporary only)
  }
}
```

**When to Increase ChannelCapacity:**
- High-volume write operations (>1000 events/sec)
- Batch imports or data migrations
- As a stopgap while implementing durable overflow and prioritization

**Trade-off:** More memory usage (~500 bytes per event in channel)

### Batch Size Tuning

**Symptom:** High database connection overhead

**Solution:** Increase `BatchSize`

```json
{
  "Audit": {
    "BatchSize": 50  // Increase from default 10
  }
}
```

**When to Increase:**
- High steady-state event volume
- Database roundtrip latency is high
- Want to reduce database IOPS

**Trade-off:** Longer delay before events appear in database

### Batch Delay Tuning

**Symptom:** Events take too long to appear in database

**Solution:** Decrease `BatchDequeueDelayMs`

```json
{
  "Audit": {
    "BatchDequeueDelayMs": 50  // Decrease from default 100
  }
}
```

**When to Decrease:**
- Real-time audit monitoring requirements
- Low event volume
- Immediate visibility needed for debugging

**Trade-off:** More CPU usage (more frequent dequeues)

### Recommended Configurations

#### Low Volume (<100 events/sec)

```json
{
  "Audit": {
    "ChannelCapacity": 1000,
    "BatchSize": 10,
    "BatchDequeueDelayMs": 100
  }
}
```

#### Medium Volume (100-1000 events/sec)

```json
{
  "Audit": {
    "ChannelCapacity": 5000,
    "BatchSize": 50,
    "BatchDequeueDelayMs": 50
  }
}
```

#### High Volume (>1000 events/sec)

```json
{
  "Audit": {
    "ChannelCapacity": 10000,
    "BatchSize": 100,
    "BatchDequeueDelayMs": 50
  }
}
```

---

## Query Optimization

### Index Usage

The audit system has indexes for common query patterns. Ensure your queries use them:

**Indexes Available:**

1. `IX_AuditEvents_Timestamp_Desc` - Time-based queries (most common)
2. `IX_AuditEvents_OrganizationId_Timestamp` - Organization-scoped queries
3. `IX_AuditEvents_ActorUserId_Timestamp` - User activity queries
4. `IX_AuditEvents_ResourceType_ResourceId_Timestamp` - Resource history
5. `IX_AuditEvents_ActionType_Timestamp` - Action type filtering

### Query Best Practices

#### ✅ DO: Always Include Date Range

```http
GET /admin/audit-events?dateFrom=2024-11-01T00:00:00Z&dateTo=2024-12-01T00:00:00Z
```

**Why:** Uses `IX_AuditEvents_Timestamp_Desc` index. Without date range, full table scan.

#### ✅ DO: Scope to Organization

```http
GET /organizations/{orgId}/audit-events?dateFrom=2024-11-01T00:00:00Z
```

**Why:** Uses `IX_AuditEvents_OrganizationId_Timestamp` index.

#### ✅ DO: Use StreamEventsAsync for Exports

```csharp
await foreach (var batch in auditService.StreamEventsAsync(query, batchSize: 100))
{
    // Process batch
}
```

**Why:** Memory-efficient. Only 100 events in memory at a time.

#### ❌ DON'T: Export Without Date Range

```http
GET /admin/audit-events/export?format=csv
```

**Why:** Full table scan. Will timeout on large databases. API enforces 90-day max range.

#### ❌ DON'T: Use LIKE on Details (Without GIN Index)

```sql
-- Slow without GIN index
SELECT * FROM "AuditEvents"
WHERE "Details" LIKE '%needle%';
```

**Why:** Full table scan. Use specific filters (ResourceType, ActionType) instead.

### Query Performance Monitoring

**Key Metrics:**

```sql
-- Slow queries (>1 second)
SELECT 
    calls,
    total_exec_time / 1000 as total_seconds,
    mean_exec_time / 1000 as mean_seconds,
    query
FROM pg_stat_statements
WHERE query LIKE '%AuditEvents%'
  AND mean_exec_time > 1000
ORDER BY total_exec_time DESC;
```

**Expected Performance:**

| Query Type | Expected Time | Index Used |
|------------|---------------|------------|
| Time range (30 days) | <100ms | Timestamp |
| Organization-scoped | <100ms | OrganizationId |
| User activity | <100ms | ActorUserId |
| Resource history | <50ms | ResourceType+ResourceId |
| Export (10K events) | <5s | Streaming |

---

## Monitoring and Alerting

### Key Metrics

#### Application Metrics (Prometheus/OpenTelemetry)

```
# Audit event production
audit_events_logged_total{outcome="success"}
audit_events_logged_total{outcome="failure"}

# Channel status
audit_channel_size_current
audit_channel_dropped_total

# Persistence performance
audit_persistence_batch_duration_seconds
audit_persistence_batch_size_count

# Query performance
audit_query_duration_seconds{endpoint="/admin/audit-events"}
audit_export_duration_seconds{format="csv"}

# Retention
audit_retention_purged_count
audit_retention_duration_seconds
```

#### Database Metrics (PostgreSQL)

```sql
-- Table size
SELECT 
    pg_size_pretty(pg_total_relation_size('AuditEvents')) as total_size,
    pg_size_pretty(pg_relation_size('AuditEvents')) as table_size,
    pg_size_pretty(pg_indexes_size('AuditEvents')) as indexes_size;

-- Row count
SELECT count(*) FROM "AuditEvents";

-- Newest and oldest events
SELECT 
    MIN("Timestamp") as oldest_event,
    MAX("Timestamp") as newest_event,
    NOW() - MAX("Timestamp") as replication_lag
FROM "AuditEvents";

-- Index usage
SELECT 
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE relname = 'AuditEvents'
ORDER BY idx_scan DESC;
```

### Recommended Alerts

#### Critical Alerts

**Alert:** Audit persistence service stopped

```yaml
alert: AuditPersistenceServiceDown
expr: audit_persistence_batch_duration_seconds == 0
for: 5m
severity: critical
description: Audit events are not being persisted to database
```

**Alert:** Database connection failed

```yaml
alert: AuditDatabaseConnectionFailed
expr: audit_persistence_errors_total > 10
for: 5m
severity: critical
description: Audit service cannot connect to database
```

#### Warning Alerts

**Alert:** Channel dropping events

```yaml
alert: AuditChannelDropping
expr: rate(audit_channel_dropped_total[5m]) > 0
severity: warning
description: Audit channel is full and dropping events. Consider increasing capacity.
```

**Alert:** Retention not running

```yaml
alert: AuditRetentionStale
expr: time() - audit_retention_last_run > 90000  # 25 hours
severity: warning
description: Audit retention has not run in over 24 hours
```

**Alert:** Table size growing rapidly

```sql
-- Monitor growth rate
SELECT 
    current_size_mb,
    previous_size_mb,
    (current_size_mb - previous_size_mb) as growth_mb,
    ((current_size_mb - previous_size_mb) / previous_size_mb) * 100 as growth_pct
FROM (
    SELECT 
        pg_table_size('AuditEvents') / (1024*1024) as current_size_mb,
        LAG(pg_table_size('AuditEvents') / (1024*1024)) OVER (ORDER BY NOW()) as previous_size_mb
    FROM generate_series(1,1)
);

-- Alert if growth >20% per week
```

**Alert:** Slow queries

```yaml
alert: AuditQuerySlow
expr: audit_query_duration_seconds > 5
for: 5m
severity: warning
description: Audit queries are taking longer than expected
```

### Health Check Endpoint

**Endpoint:** `GET /health`

Includes audit system status:

```json
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "auditPersistence": "healthy",
    "auditRetention": "healthy"
  },
  "auditMetrics": {
    "channelSize": 42,
    "channelCapacity": 1000,
    "pendingEvents": 42,
    "lastPersistenceRun": "2024-12-03T10:30:00Z",
    "lastRetentionRun": "2024-12-03T02:00:00Z"
  }
}
```

---

## Backup and Recovery

### Database Backups

Audit events are stored in the main application database. Ensure your database backup strategy covers the `AuditEvents` table.

**Recommended Backup Frequency:**
- **Production:** Daily full backup + continuous WAL archiving
- **Staging:** Weekly full backup
- **Development:** No backups needed (use seed data)

### Cold Storage Archival

For long-term retention beyond the database retention period:

#### Option 1: Monthly Export to S3/Azure Blob

```bash
#!/bin/bash
# Export previous month's audit events

YEAR=$(date -d "last month" +%Y)
MONTH=$(date -d "last month" +%m)
FILENAME="audit-events-${YEAR}-${MONTH}.csv"

# Call audit export API
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "https://api.example.com/admin/audit-events/export?format=csv&dateFrom=${YEAR}-${MONTH}-01T00:00:00Z&dateTo=${YEAR}-${MONTH}-31T23:59:59Z" \
     -o "$FILENAME"

# Upload to S3
aws s3 cp "$FILENAME" "s3://my-bucket/audit-archive/${YEAR}/${FILENAME}"

# Verify upload
if [ $? -eq 0 ]; then
    echo "Archive uploaded successfully"
else
    echo "Archive upload failed" >&2
    exit 1
fi
```

**Schedule:** Run on 1st of each month via cron

```cron
0 3 1 * * /opt/scripts/archive-audit-events.sh
```

#### Option 2: PostgreSQL Foreign Tables (Advanced)

Use PostgreSQL foreign data wrapper to query archived data:

```sql
-- Create foreign table pointing to Parquet files in S3
CREATE FOREIGN TABLE audit_events_archive (
    -- Same schema as AuditEvents
)
SERVER s3_server
OPTIONS (filename 's3://my-bucket/audit-archive/*.parquet');

-- Query both current and archived data
SELECT * FROM (
    SELECT * FROM "AuditEvents"
    UNION ALL
    SELECT * FROM audit_events_archive
) WHERE "Timestamp" BETWEEN '2020-01-01' AND '2024-12-31';
```

### Disaster Recovery

**Recovery Time Objective (RTO):** <1 hour  
**Recovery Point Objective (RPO):** <1 hour

**Recovery Procedure:**

1. Restore database from latest backup
2. Restore application services
3. Verify audit persistence service is running
4. Check health endpoint for audit system status

**Data Loss Window:** Up to 1 hour of audit events (based on backup frequency)

**Mitigation:** Use PostgreSQL WAL archiving for point-in-time recovery

---

## Troubleshooting Common Issues

### Issue 1: Audit Events Not Appearing

**Symptoms:**
- Events logged by application but not in database
- `audit_channel_size_current` metric increasing but `audit_persistence_batch_duration_seconds` is 0

**Diagnosis:**

```bash
# Check persistence service logs
docker logs fan-engagement-api | grep "Audit persistence"

# Check for errors
docker logs fan-engagement-api | grep "ERROR.*Audit"

# Check database connectivity
psql -h localhost -U postgres -d fanengagement -c "SELECT COUNT(*) FROM \"AuditEvents\";"
```

**Common Causes:**

1. **Persistence service crashed**
   - **Fix:** Restart application
   - **Prevention:** Monitor health endpoint

2. **Database connection lost**
   - **Fix:** Check database availability, connection string
   - **Prevention:** Database monitoring and alerts

3. **Channel full (events dropped)**
   - **Fix:** Increase `ChannelCapacity` in config
   - **Prevention:** Monitor `audit_channel_dropped_total` metric

4. **Events not flushed yet (waiting in channel)**
   - **Fix:** Wait up to `BatchDequeueDelayMs` (default 100ms)
   - **Prevention:** Decrease delay if immediate visibility needed

### Issue 2: Slow Audit Queries

**Symptoms:**
- API requests to `/audit-events` timing out
- High CPU on database server when querying audit logs

**Diagnosis:**

```sql
-- Find slow audit queries
SELECT 
    pid,
    now() - query_start as duration,
    query
FROM pg_stat_activity
WHERE query LIKE '%AuditEvents%'
  AND state = 'active'
ORDER BY duration DESC;

-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM "AuditEvents"
WHERE "Timestamp" BETWEEN '2024-01-01' AND '2024-12-31'
ORDER BY "Timestamp" DESC
LIMIT 100;
```

**Common Causes:**

1. **Missing date range filter**
   - **Fix:** Enforce date range in API (already done, max 90 days for exports)
   - **Prevention:** Client-side validation

2. **Table bloat**
   - **Fix:** Run `VACUUM FULL "AuditEvents";` during maintenance window
   - **Prevention:** Regular `VACUUM` (PostgreSQL does this automatically)

3. **Missing index**
   - **Fix:** Rebuild indexes if corruption suspected
   - **Prevention:** Monitor index usage statistics

4. **Large result set**
   - **Fix:** Use pagination or streaming export
   - **Prevention:** Rate limit export endpoints

### Issue 3: Database Size Growing Too Fast

**Symptoms:**
- Disk usage increasing rapidly
- Database backup time increasing

**Diagnosis:**

```sql
-- Check table and index sizes
SELECT 
    pg_size_pretty(pg_total_relation_size('AuditEvents')) as total_size,
    pg_size_pretty(pg_relation_size('AuditEvents')) as table_size,
    pg_size_pretty(pg_indexes_size('AuditEvents')) as indexes_size;

-- Count events by month
SELECT 
    DATE_TRUNC('month', "Timestamp") as month,
    COUNT(*) as event_count,
    pg_size_pretty(SUM(octet_length("Details"::text))::bigint) as details_size
FROM "AuditEvents"
GROUP BY month
ORDER BY month DESC;

-- Find largest details
SELECT 
    "Id",
    "ActionType",
    "ResourceType",
    "Timestamp",
    LENGTH("Details") as details_length
FROM "AuditEvents"
ORDER BY details_length DESC
LIMIT 20;
```

**Common Causes:**

1. **Retention not running**
   - **Fix:** Check `AuditRetentionBackgroundService` logs
   - **Prevention:** Monitor `audit_retention_last_run` metric

2. **Retention period too long**
   - **Fix:** Decrease `RetentionDays` (min 30, recommended 90-365)
   - **Prevention:** Archive to cold storage before purge

3. **Large details payloads**
   - **Fix:** Review code logging excessive details
   - **Prevention:** Code review guidelines (see Development Guide)

4. **High event volume**
   - **Fix:** This is expected. Ensure retention is working.
   - **Prevention:** Provision appropriate storage

### Issue 4: High Memory Usage

**Symptoms:**
- Application memory usage increasing
- Out of memory errors

**Diagnosis:**

```bash
# Check channel size
curl http://localhost:5000/health | jq '.auditMetrics.channelSize'

# Check for memory leaks
dotnet-counters monitor --process-id <PID>
```

**Common Causes:**

1. **Channel capacity too high**
   - **Fix:** Decrease `ChannelCapacity` if excessive (>10000)
   - **Prevention:** Balance between capacity and memory

2. **Persistence service not dequeuing**
   - **Fix:** Restart application
   - **Prevention:** Monitor persistence service health

3. **Large details payloads**
   - **Fix:** Review code for excessive detail logging
   - **Prevention:** Limit details to essential information

### Issue 5: Retention Purge Taking Too Long

**Symptoms:**
- `AuditRetentionBackgroundService` running for hours
- Database locks during purge

**Diagnosis:**

```sql
-- Check for long-running DELETE
SELECT 
    pid,
    now() - query_start as duration,
    query
FROM pg_stat_activity
WHERE query LIKE '%DELETE%AuditEvents%'
  AND state = 'active';

-- Check table locks
SELECT 
    locktype,
    relation::regclass,
    mode,
    granted
FROM pg_locks
WHERE relation = 'AuditEvents'::regclass;
```

**Common Causes:**

1. **Batch size too large**
   - **Fix:** Decrease `PurgeBatchSize` (default 1000)
   - **Prevention:** Tune for your database load

2. **Too many old events**
   - **Fix:** One-time manual cleanup, then rely on scheduled purge
   - **Prevention:** Run purge daily

3. **Database under load**
   - **Fix:** Schedule purge during off-peak hours
   - **Prevention:** Adjust `PurgeSchedule` cron expression

---

## Querying Audit Logs

### API Endpoints

#### Admin: Query All Events

```http
GET /admin/audit-events
  ?organizationId={guid}           # Optional: filter by org
  &actionType=Created,Updated      # Optional: comma-separated
  &resourceType=User,Proposal      # Optional: comma-separated
  &resourceId={guid}               # Optional: specific resource
  &actorUserId={guid}              # Optional: specific user
  &dateFrom=2024-11-01T00:00:00Z   # Optional: start date
  &dateTo=2024-12-01T00:00:00Z     # Optional: end date
  &outcome=Success                 # Optional: Success/Failure/Denied/Partial
  &page=1                          # Optional: page number (default 1)
  &pageSize=50                     # Optional: page size (default 10, max 100)

Authorization: Bearer {globalAdminToken}
```

#### Organization: Query Org Events

```http
GET /organizations/{orgId}/audit-events
  ?actionType=Created,Updated
  &resourceType=Proposal,Vote
  &dateFrom=2024-11-01T00:00:00Z
  &dateTo=2024-12-01T00:00:00Z
  &page=1
  &pageSize=50

Authorization: Bearer {orgAdminToken}
```

#### User: Query Own Events

```http
GET /users/{userId}/audit-events
  ?actionType=Created,Updated
  &dateFrom=2024-11-01T00:00:00Z
  &dateTo=2024-12-01T00:00:00Z
  &page=1
  &pageSize=50

Authorization: Bearer {userToken}
```

**Note:** IP addresses are filtered out for privacy.

### Export Endpoints

#### CSV Export

```http
GET /admin/audit-events/export
  ?format=csv
  &dateFrom=2024-11-01T00:00:00Z
  &dateTo=2024-12-01T00:00:00Z
  &organizationId={guid}           # Optional

Authorization: Bearer {globalAdminToken}
```

**Rate Limit:** 10 requests per 10 minutes per user

**Response:** Streamed CSV file

```csv
Id,Timestamp,ActorUserId,ActorDisplayName,ActionType,ResourceType,ResourceId,ResourceName,OrganizationId,Outcome,Details
7f3e8d92-...,2024-12-03T10:30:00Z,a1b2c3d4-...,John Doe,Created,User,a1b2c3d4-...,John Doe,,Success,"{""email"":""user@example.com""}"
```

#### JSON Export

```http
GET /admin/audit-events/export?format=json&dateFrom=...&dateTo=...
```

**Response:** Newline-delimited JSON (NDJSON)

```json
{"id":"7f3e8d92-...","timestamp":"2024-12-03T10:30:00Z","actionType":"Created",...}
{"id":"8g4f9e03-...","timestamp":"2024-12-03T10:31:00Z","actionType":"Updated",...}
```

### Database Queries

For advanced analysis, query the database directly:

```sql
-- Most active users (last 30 days)
SELECT 
    "ActorUserId",
    "ActorDisplayName",
    COUNT(*) as action_count
FROM "AuditEvents"
WHERE "Timestamp" >= NOW() - INTERVAL '30 days'
  AND "ActorUserId" IS NOT NULL
GROUP BY "ActorUserId", "ActorDisplayName"
ORDER BY action_count DESC
LIMIT 20;

-- Most common actions by organization
SELECT 
    "OrganizationId",
    "OrganizationName",
    "ActionType",
    COUNT(*) as action_count
FROM "AuditEvents"
WHERE "Timestamp" >= NOW() - INTERVAL '7 days'
GROUP BY "OrganizationId", "OrganizationName", "ActionType"
ORDER BY action_count DESC;

-- Failed actions by type
SELECT 
    "ActionType",
    "ResourceType",
    "Outcome",
    COUNT(*) as failure_count
FROM "AuditEvents"
WHERE "Outcome" IN ('Failure', 'Denied')
  AND "Timestamp" >= NOW() - INTERVAL '7 days'
GROUP BY "ActionType", "ResourceType", "Outcome"
ORDER BY failure_count DESC;

-- Audit trail for specific resource
SELECT 
    "Timestamp",
    "ActionType",
    "ActorDisplayName",
    "Outcome",
    "Details"
FROM "AuditEvents"
WHERE "ResourceType" = 'Proposal'
  AND "ResourceId" = 'your-proposal-id-here'
ORDER BY "Timestamp" ASC;
```

---

## Security and Compliance

### Access Control

| Endpoint | Required Role | Scope |
|----------|---------------|-------|
| `GET /admin/audit-events` | GlobalAdmin | All organizations |
| `GET /organizations/{orgId}/audit-events` | OrgAdmin | Specific organization |
| `GET /users/{userId}/audit-events` | User (self) | Own events only |

### Privacy Controls

**IP Address Filtering:**
- Admin APIs: IP addresses included
- User API: IP addresses **removed** for privacy

**Details Filtering:**
- Sensitive fields (passwords, secrets) never logged
- Webhook URLs are masked
- Email addresses may be masked based on policy

### Compliance Considerations

#### GDPR

**Data Subject Access Requests (DSAR):**

```http
# Export all audit events for a user
GET /admin/audit-events/export?format=json&actorUserId={userId}
```

**Right to Erasure:**

Audit events are **immutable** by design for compliance. For GDPR erasure requests:
1. Anonymize `ActorDisplayName` and `ActorIpAddress` fields
2. Keep event structure intact for audit trail integrity
3. Document anonymization in the event details

```sql
-- Anonymize user in audit events (GDPR erasure)
UPDATE "AuditEvents"
SET 
    "ActorDisplayName" = 'Anonymized User',
    "ActorIpAddress" = NULL,
    "Details" = jsonb_set(
        "Details"::jsonb, 
        '{gdprAnonymized}', 
        'true'::jsonb
    )::text
WHERE "ActorUserId" = 'user-id-to-anonymize';
```

#### SOX / HIPAA

**Immutability:** Audit events cannot be modified or deleted (except automated retention)

**Separation of Duties:** Different roles for creating vs. querying audit events

**Tamper Evidence:** All audit events have immutable timestamps and IDs

**Retention:** Configure retention period to meet compliance requirements (7 years for SOX)

#### ISO 27001

**Audit Trail:** Comprehensive logging of all security-relevant events

**Access Logging:** All access to audit logs is itself audited

**Monitoring:** Automated alerts for security events

---

## Related Documentation

- **[Architecture Overview](./architecture.md)** - System design and component architecture
- **[Event Catalog](./events.md)** - Complete list of all audit events
- **[Development Guide](./development.md)** - How to add new audit events
- **[Retention Configuration](./retention-configuration.md)** - Detailed retention setup

---

## Operations Checklist

### Daily

- [ ] Check health endpoint for audit system status
- [ ] Review dropped events metric (`audit_channel_dropped_total`)
- [ ] Verify retention service ran (last 24 hours)

### Weekly

- [ ] Review slow query logs for audit queries
- [ ] Check database size growth trend
- [ ] Review security alerts (authorization denials, failed logins)

### Monthly

- [ ] Export previous month's audit events to cold storage
- [ ] Review and adjust retention policy if needed
- [ ] Analyze audit metrics for capacity planning

### Quarterly

- [ ] Review and update access control policies
- [ ] Test disaster recovery procedure
- [ ] Audit the audit system (meta-audit)
