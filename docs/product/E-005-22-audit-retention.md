---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-22: Configure audit log retention"
labels: ["development", "copilot", "audit", "backend", "operations", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Implement configurable audit log retention to manage storage growth by automatically purging old audit events based on configurable retention periods.

---

## 2. Requirements

- Add configuration for retention period
- Implement background job to purge old events
- Log purge operations
- Document configuration options

---

## 3. Acceptance Criteria (Testable)

- [ ] Add configuration for retention period (days):
  - `AuditLogging:RetentionDays` in appsettings.json
  - Default value: 365 (1 year)
  - Minimum value: 30 days
- [ ] Implement background job to purge old audit events:
  - Run on configurable schedule (default: daily at 2 AM UTC)
  - Delete events older than retention period
  - Process in batches to avoid locking
- [ ] Log purge operations:
  - Log start/end of purge job
  - Log number of events purged
  - Log any errors encountered
- [ ] Audit the purge action itself:
  - Create audit event for each purge operation
  - Include: count deleted, date range, duration
- [ ] Add configuration documentation:
  - Document all settings in appsettings.json
  - Document in operations runbook
- [ ] Test retention with various configurations
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering
- Use existing background service patterns
- Batch deletions to avoid database locks
- Consider archival before purge (document as future enhancement)

---

## 5. Technical Notes (Optional)

**Configuration:**

```json
{
  "AuditLogging": {
    "RetentionDays": 365,
    "PurgeSchedule": "0 2 * * *",
    "PurgeBatchSize": 1000
  }
}
```

**Background Service Pattern:**

```csharp
public class AuditRetentionBackgroundService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            if (IsPurgeTime())
            {
                await PurgeOldEventsAsync(stoppingToken);
            }
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task PurgeOldEventsAsync(CancellationToken ct)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-_retentionDays);
        var totalDeleted = 0;
        
        while (true)
        {
            var deleted = await _dbContext.AuditEvents
                .Where(e => e.Timestamp < cutoffDate)
                .Take(_batchSize)
                .ExecuteDeleteAsync(ct);
            
            if (deleted == 0) break;
            totalDeleted += deleted;
        }
        
        _logger.LogInformation("Purged {Count} audit events older than {CutoffDate}", 
            totalDeleted, cutoffDate);
    }
}
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-04 (Database schema), E-005-05 (Audit service)
- Future enhancement: Archive to cold storage before purge

---

## 6. Desired Agent

Select one:

- [x] **Default Coding Agent**
- [ ] **docs-agent** (documentation only)
- [ ] **test-agent** (tests only)
- [ ] **lint-agent** (formatting / safe refactor only)
- [ ] **product-owner-agent** (idea → epic/story refinement; no code)

---

## 7. Files Allowed to Change

Allowed:
- backend/FanEngagement.Infrastructure/BackgroundServices/**
- backend/FanEngagement.Api/appsettings.json
- backend/FanEngagement.Api/appsettings.Development.json
- backend/FanEngagement.Infrastructure/DependencyInjection.cs
- backend/FanEngagement.Tests/**
- docs/audit/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Configuration documentation
- Integration tests for retention purge logic
- All tests pass
