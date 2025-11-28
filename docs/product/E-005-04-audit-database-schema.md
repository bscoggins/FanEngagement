---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-04: Create the audit event database schema"
labels: ["development", "copilot", "audit", "database", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Create the database schema for audit events, including the EF Core entity, configuration, and migration. This establishes the persistence layer for the audit logging system.

---

## 2. Requirements

- Follow the data model defined in `docs/audit/` (from E-005-01)
- Use EF Core with PostgreSQL-specific features (JSONB)
- Create appropriate indexes for query performance
- Follow existing entity and migration patterns in the codebase

---

## 3. Acceptance Criteria (Testable)

- [ ] Create EF Core entity `AuditEvent` in Domain layer with all defined fields:
  - `Id` (Guid, primary key)
  - `Timestamp` (DateTime, UTC)
  - `ActorUserId` (Guid, nullable)
  - `ActorDisplayName` (string, max 200)
  - `ActorIpAddress` (string, max 45, nullable)
  - `ActionType` (enum)
  - `ResourceType` (enum)
  - `ResourceId` (Guid)
  - `ResourceName` (string, max 500)
  - `OrganizationId` (Guid, nullable)
  - `OrganizationName` (string, max 200, nullable)
  - `Details` (string/JSON)
  - `CorrelationId` (string, max 50, nullable)
  - `Outcome` (enum)
  - `FailureReason` (string, max 1000, nullable)
- [ ] Create `AuditActionType` enum in Domain layer
- [ ] Create `AuditResourceType` enum in Domain layer
- [ ] Create `AuditOutcome` enum in Domain layer
- [ ] Create EF Core entity configuration for `AuditEvent`
- [ ] Configure `Details` as JSONB column for PostgreSQL
- [ ] Create EF Core migration for `AuditEvents` table
- [ ] Add indexes on:
  - `Timestamp` (for date range queries)
  - `OrganizationId` (for org-scoped queries)
  - `ActorUserId` (for user action queries)
  - `(ResourceType, ResourceId)` composite (for resource history)
  - `ActionType` (for filtering)
- [ ] Add `DbSet<AuditEvent>` to `FanEngagementDbContext`
- [ ] Test migration up and down successfully
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering (`Domain` for entities/enums, `Infrastructure` for EF config)
- Use existing migration naming conventions
- No changes to existing entities or tables
- Non-breaking change (new table only)

---

## 5. Technical Notes (Optional)

**Existing Patterns:**

- Entity definitions: `backend/FanEngagement.Domain/Entities/`
- EF configurations: `backend/FanEngagement.Infrastructure/Data/Configurations/`
- Migrations: `backend/FanEngagement.Infrastructure/Data/Migrations/`
- DbContext: `backend/FanEngagement.Infrastructure/Data/FanEngagementDbContext.cs`

**PostgreSQL JSONB Configuration:**

```csharp
builder.Property(e => e.Details)
    .HasColumnType("jsonb");
```

**Index Examples:**

```csharp
builder.HasIndex(e => e.Timestamp);
builder.HasIndex(e => e.OrganizationId);
builder.HasIndex(e => new { e.ResourceType, e.ResourceId });
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-01 (Data model design)
- Dependency for: E-005-05 (Audit service)

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
- backend/FanEngagement.Domain/Entities/**
- backend/FanEngagement.Domain/Enums/**
- backend/FanEngagement.Infrastructure/Data/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Migration file included
- Confirmation that migration runs successfully (up and down)
- All tests pass
