# Audit Log Retention Configuration

> **Document Type:** Operations Guide  
> **Epic:** E-005 - Implement Thorough Audit Logging Across the Application  
> **Issue:** E-005-22  
> **Status:** Complete  
> **Last Updated:** December 3, 2024  
> **Depends On:** E-005-04 (Database Schema), E-005-05 (Audit Service)

## Executive Summary

This document describes the audit log retention feature that automatically purges old audit events to manage storage growth. The retention system runs on a configurable schedule and deletes events in batches to avoid database locks while maintaining recent audit history.

**Key Features:**

- Configurable retention period (minimum 30 days)
- Scheduled automatic purge (default: daily at 2 AM UTC)
- Batch deletion to prevent database locking
- Self-auditing of purge operations
- Fail-safe operation that never impacts business functionality

---

## Table of Contents

1. [Configuration](#1-configuration)
2. [Background Service](#2-background-service)
3. [Purge Process](#3-purge-process)
4. [Monitoring](#4-monitoring)
5. [Troubleshooting](#5-troubleshooting)
6. [Future Enhancements](#6-future-enhancements)

---

## 1. Configuration

### 1.1 Configuration Settings

Add the following section to `appsettings.json` or `appsettings.{Environment}.json`:

```json
{
  "AuditRetention": {
    "RetentionDays": 365,
    "PurgeSchedule": "0 2 * * *",
    "PurgeBatchSize": 1000
  }
}
```

### 1.2 Configuration Options

| Setting | Type | Default | Min/Max | Description |
|---------|------|---------|---------|-------------|
| `RetentionDays` | int | 365 | 30 - unlimited | Number of days to retain audit events. Events older than this are purged. |
| `PurgeSchedule` | string | "0 2 * * *" | Valid cron | Cron expression for purge schedule. Format: `minute hour day-of-month month day-of-week` |
| `PurgeBatchSize` | int | 1000 | 1 - 10000 | Number of events to delete per batch. Smaller batches reduce database lock time. |

### 1.3 Schedule Format

The `PurgeSchedule` follows cron syntax:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of the month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of the week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Common Schedules:**

- `0 2 * * *` - Daily at 2:00 AM UTC (default)
- `0 3 * * 0` - Weekly on Sunday at 3:00 AM UTC
- `0 1 1 * *` - Monthly on the 1st at 1:00 AM UTC

**Note:** The background service checks hourly whether it's time to purge, and will not run more than once per day.

### 1.4 Environment-Specific Configuration

**Production** (`appsettings.json`):
```json
{
  "AuditRetention": {
    "RetentionDays": 365,
    "PurgeSchedule": "0 2 * * *",
    "PurgeBatchSize": 1000
  }
}
```

**Development** (`appsettings.Development.json`):
```json
{
  "AuditRetention": {
    "RetentionDays": 90,
    "PurgeSchedule": "0 2 * * *",
    "PurgeBatchSize": 1000
  }
}
```

---

## 2. Background Service

### 2.1 Service Registration

The `AuditRetentionBackgroundService` is automatically registered in `DependencyInjection.cs`:

```csharp
services.Configure<AuditRetentionOptions>(
    configuration.GetSection("AuditRetention"));

services.AddHostedService<AuditRetentionBackgroundService>();
```

### 2.2 Service Lifecycle

The background service:

1. Starts when the application starts
2. Checks every hour whether it's time to run the purge
3. Executes the purge if the current time matches the schedule
4. Runs at most once per day
5. Stops gracefully when the application shuts down

### 2.3 Startup Logging

When the service starts, it logs configuration details:

```
AuditRetentionBackgroundService started (retention: 365 days, schedule: 0 2 * * *, batch size: 1000)
```

---

## 3. Purge Process

### 3.1 Purge Algorithm

The purge process follows these steps:

1. **Calculate Cutoff Date**: `DateTime.UtcNow.AddDays(-RetentionDays)`
2. **Delete in Batches**: 
   - Select up to `PurgeBatchSize` events older than cutoff
   - Delete them using `ExecuteDeleteAsync` (efficient bulk delete)
   - Track total deleted count
3. **Repeat**: Continue until no more old events remain
4. **Audit**: Create an audit event documenting the purge operation
5. **Log**: Record completion with count and duration

### 3.2 Example Purge Flow

```
1. Start purge for events older than 2023-12-03
2. Delete batch 1: 1000 events (total: 1000)
3. Delete batch 2: 1000 events (total: 2000)
4. Delete batch 3: 347 events (total: 2347)
5. No more old events found
6. Create audit event for purge operation
7. Complete: deleted 2347 events in 1.34 seconds
```

### 3.3 Database Impact

**Performance Characteristics:**

- Uses `ExecuteDeleteAsync` for efficient bulk deletes
- Processes in configurable batch sizes (default: 1000)
- Small delay (100ms) between batches to reduce lock contention
- Runs during low-traffic hours (default: 2 AM UTC)

**Recommendations:**

- **High-traffic systems**: Reduce `PurgeBatchSize` to 500 or lower
- **Low-traffic systems**: Increase `PurgeBatchSize` to 5000 or higher
- **Large databases**: Schedule during maintenance windows

---

## 4. Monitoring

### 4.1 Log Messages

**Start of Purge:**
```
Starting audit event purge for events older than 2023-12-03 (365 days)
```

**Batch Progress (Debug level):**
```
Purged batch of 1000 audit events (total: 1000)
Purged batch of 1000 audit events (total: 2000)
```

**Completion:**
```
Completed audit event purge: deleted 2347 events in 1.34 seconds
```

**Errors:**
```
Failed to complete audit event purge after deleting 1000 events
```

### 4.2 Audit Trail

Each purge operation creates an audit event with:

- **ActionType**: `Deleted`
- **ResourceType**: `AuditEvent`
- **ResourceName**: "Audit Log Purge"
- **ActorDisplayName**: "System"
- **Details**: JSON with purge metadata

Example audit event details:
```json
{
  "DeletedCount": 2347,
  "CutoffDate": "2023-12-03T05:53:00.000Z",
  "RetentionDays": 365,
  "DurationSeconds": 1.34
}
```

### 4.3 Metrics to Monitor

| Metric | Source | Threshold |
|--------|--------|-----------|
| Purge duration | Logs | > 5 minutes (investigate) |
| Events deleted | Audit events | Sudden spikes (investigate) |
| Purge failures | Error logs | Any failures |
| Database size | PostgreSQL | Continuous growth |

---

## 5. Troubleshooting

### 5.1 Common Issues

**Issue: Purge not running**

*Symptoms:* No purge log messages, database size growing

*Solutions:*
1. Check configuration is present in `appsettings.json`
2. Verify cron schedule format is correct
3. Ensure `RetentionDays >= 30`
4. Check application logs for startup errors

**Issue: Database locks during purge**

*Symptoms:* Long-running queries, slow application performance

*Solutions:*
1. Reduce `PurgeBatchSize` (try 500 or 250)
2. Schedule purge during lower-traffic hours
3. Add indexes on `Timestamp` column if not present

**Issue: Purge taking too long**

*Symptoms:* Purge duration > 5 minutes

*Solutions:*
1. Increase `PurgeBatchSize` if database can handle it
2. Check database query performance
3. Consider running purge more frequently with shorter retention

**Issue: Configuration validation errors**

*Symptoms:* Application fails to start with configuration error

*Solutions:*
1. Ensure `RetentionDays >= 30`
2. Ensure `PurgeBatchSize` between 1 and 10000
3. Ensure `PurgeSchedule` is not empty

### 5.2 Diagnostic Queries

**Check old events waiting to be purged:**
```sql
SELECT COUNT(*) 
FROM "AuditEvents" 
WHERE "Timestamp" < NOW() - INTERVAL '365 days';
```

**View recent purge operations:**
```sql
SELECT "Timestamp", "Details"
FROM "AuditEvents"
WHERE "ResourceName" = 'Audit Log Purge'
ORDER BY "Timestamp" DESC
LIMIT 10;
```

**Check database size:**
```sql
SELECT 
  pg_size_pretty(pg_total_relation_size('AuditEvents')) as total_size,
  pg_size_pretty(pg_relation_size('AuditEvents')) as table_size,
  pg_size_pretty(pg_indexes_size('AuditEvents')) as indexes_size;
```

---

## 6. Future Enhancements

The current retention system provides basic purge functionality. Future enhancements could include:

### 6.1 Archive to Cold Storage

Before purging, archive events to cold storage:

- **AWS S3**: Infrequent Access or Glacier
- **Azure Blob Storage**: Cool or Archive tier
- **File System**: Compressed JSON files

**Benefits:**
- Compliance with long-term retention requirements
- Cost-effective storage for historical data
- Ability to restore archived events if needed

### 6.2 Selective Retention Policies

Different retention periods based on event characteristics:

```json
{
  "AuditRetention": {
    "Policies": [
      {
        "Name": "Security Events",
        "Filter": "ActionType IN ('AuthSuccess', 'AuthFailure')",
        "RetentionDays": 730
      },
      {
        "Name": "Standard Events",
        "Filter": "*",
        "RetentionDays": 365
      }
    ]
  }
}
```

### 6.3 Compliance Features

- **Legal Hold**: Mark specific events or date ranges as non-purgeable
- **Retention Policies by Organization**: Different retention per organization
- **Immutability**: Write-once audit logs with blockchain verification

### 6.4 Advanced Scheduling

- **Multiple schedules**: Different purge times for different event types
- **Rate limiting**: Maximum events deleted per hour
- **Maintenance windows**: Only purge during specified time ranges

---

## Appendix A: Configuration Class

The `AuditRetentionOptions` class enforces configuration constraints:

```csharp
public class AuditRetentionOptions
{
    /// <summary>
    /// Number of days to retain audit events. Must be at least 30 days.
    /// Default: 365 days.
    /// </summary>
    public int RetentionDays { get; set; } = 365;

    /// <summary>
    /// Number of events to delete per batch. Must be between 1 and 10000.
    /// Default: 1000.
    /// </summary>
    public int PurgeBatchSize { get; set; } = 1000;

    /// <summary>
    /// Cron expression for purge schedule.
    /// Default: "0 2 * * *" (daily at 2 AM UTC).
    /// </summary>
    public string PurgeSchedule { get; set; } = "0 2 * * *";
}
```

## Appendix B: Testing

Comprehensive tests are available in `AuditRetentionTests.cs`:

- Configuration validation tests
- Purge operation tests
- Batch processing tests
- Edge case handling tests
- Audit event creation tests

Run tests with:
```bash
dotnet test --filter "FullyQualifiedName~AuditRetentionTests"
```

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2024-12-03 | System | Initial documentation for audit retention feature (E-005-22) |
