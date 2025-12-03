# Audit Logging Development Guide

> **Document Type:** Development Guide  
> **Epic:** E-005 - Implement Thorough Audit Logging Across the Application  
> **Status:** Complete  
> **Last Updated:** December 3, 2024

## Executive Summary

This guide provides developers with everything they need to add new audit events, test them, and follow best practices. The audit system is designed to be:

- **Easy to use:** Fluent `AuditEventBuilder` API with compile-time safety
- **Non-intrusive:** Fire-and-forget logging that never blocks business operations
- **Testable:** Integration test helpers and patterns
- **Consistent:** Standard patterns for common scenarios

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Adding New Audit Events](#adding-new-audit-events)
3. [AuditEventBuilder Usage](#auditeventbuilder-usage)
4. [Common Patterns](#common-patterns)
5. [Testing Audit Events](#testing-audit-events)
6. [Best Practices](#best-practices)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Performance Considerations](#performance-considerations)

---

## Quick Start

### 1. Basic Audit Event

```csharp
public class MyService(
    ApplicationDbContext context,
    IAuditService auditService,
    ILogger<MyService> logger)
{
    public async Task<MyEntity> CreateEntityAsync(CreateRequest request, CancellationToken cancellationToken)
    {
        // 1. Perform business operation
        var entity = new MyEntity { /* ... */ };
        await context.MyEntities.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        // 2. Log audit event (fire-and-forget)
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.Created)
                    .WithResource(AuditResourceType.MyEntity, entity.Id, entity.Name)
                    .WithDetails(new { entity.Name, entity.Description })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Log but don't propagate audit failures
            logger.LogWarning(ex, "Failed to audit entity creation for {EntityId}", entity.Id);
        }

        return entity;
    }
}
```

### 2. Audit Event with Actor

```csharp
await auditService.LogAsync(
    new AuditEventBuilder()
        .WithActor(userId, displayName)
        .WithAction(AuditActionType.Created)
        .WithResource(AuditResourceType.Organization, org.Id, org.Name)
        .WithOrganization(org.Id, org.Name)
        .WithDetails(new { org.Name, org.Description })
        .AsSuccess(),
    cancellationToken);
```

### 3. Audit Event with Failure

```csharp
try
{
    // Business operation
}
catch (Exception ex)
{
    await auditService.LogAsync(
        new AuditEventBuilder()
            .WithActor(userId, displayName)
            .WithAction(AuditActionType.Created)
            .WithResource(AuditResourceType.MyEntity, Guid.Empty, "Unknown")
            .AsFailure($"Failed to create entity: {ex.Message}")
            .WithDetails(new { attemptedName = request.Name }),
        cancellationToken);
    throw;
}
```

---

## Adding New Audit Events

### Step 1: Determine if New Enums Are Needed

Check if existing `AuditActionType` and `AuditResourceType` values cover your use case.

**Existing ActionTypes:**
- `Created`, `Updated`, `Deleted` - Resource lifecycle
- `StatusChanged`, `RoleChanged` - State changes
- `Authenticated`, `AuthorizationDenied` - Auth events
- `Accessed`, `Exported` - Read operations
- `AdminDataSeeded`, `AdminDataReset`, `AdminDataCleanup` - Admin ops

**Existing ResourceTypes:**
- Core: `User`, `Organization`, `Membership`
- Shares: `ShareType`, `ShareIssuance`, `ShareBalance`
- Governance: `Proposal`, `ProposalOption`, `Vote`
- Integrations: `WebhookEndpoint`, `OutboundEvent`
- System: `AuditEvent`, `SystemConfiguration`

### Step 2: Add New Enum Values (If Needed)

If you need new action or resource types, add them to the enums:

**AuditActionType.cs:**

```csharp
namespace FanEngagement.Domain.Enums;

public enum AuditActionType : short
{
    // Existing values...
    
    // Add new action type (use next available value)
    MyNewAction = 50
}
```

**AuditResourceType.cs:**

```csharp
namespace FanEngagement.Domain.Enums;

public enum AuditResourceType : short
{
    // Existing values...
    
    // Add new resource type (use next available value in appropriate range)
    MyNewResource = 50
}
```

**Numbering Guidelines:**
- **0-9:** Core entities
- **10-19:** Share management
- **20-29:** Governance
- **30-39:** Integrations
- **40-49:** Audit and system
- **50+:** Extensions

### Step 3: Add Audit Logging to Your Service

**Location:** Service layer (Infrastructure project)

```csharp
public class MyEntityService(
    ApplicationDbContext context,
    IAuditService auditService,
    ILogger<MyEntityService> logger)
{
    public async Task<MyEntity> CreateAsync(CreateRequest request, CancellationToken cancellationToken)
    {
        // Business logic
        var entity = new MyEntity { /* ... */ };
        await context.MyEntities.AddAsync(entity, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);

        // Audit logging (wrap in try-catch to prevent audit failures from affecting business logic)
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithActor(/* userId */, /* displayName */)
                    .WithAction(AuditActionType.Created)
                    .WithResource(AuditResourceType.MyNewResource, entity.Id, entity.Name)
                    .WithOrganization(/* orgId */, /* orgName */) // If applicable
                    .WithDetails(new 
                    {
                        // Include relevant fields (NOT sensitive data like passwords)
                        entity.Name,
                        entity.Description,
                        CreatedAt = entity.CreatedAt
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Log warning but don't propagate
            logger.LogWarning(ex, "Failed to audit creation for MyEntity {EntityId}", entity.Id);
        }

        return entity;
    }
}
```

### Step 4: Document the Event

Add your new event to `docs/audit/events.md` following the existing template:

```markdown
### My Entity Created

Logged when a new MyEntity is created.

- **ActionType:** `Created`
- **ResourceType:** `MyNewResource`
- **Trigger:** `POST /my-entities`
- **Actor:** The user creating the entity

**Details Structure:**

\```json
{
  "name": "Example Name",
  "description": "Example Description",
  "createdAt": "2024-12-03T10:00:00Z"
}
\```

**Example Event:**

\```json
{
  "id": "...",
  "timestamp": "2024-12-03T10:00:00Z",
  "actorUserId": "...",
  "actorDisplayName": "John Doe",
  "actionType": "Created",
  "resourceType": "MyNewResource",
  "resourceId": "...",
  "resourceName": "Example Name",
  "outcome": "Success",
  "details": "..."
}
\```
```

### Step 5: Add Tests

See [Testing Audit Events](#testing-audit-events) section below.

---

## AuditEventBuilder Usage

The `AuditEventBuilder` provides a fluent API for constructing audit events with compile-time safety.

### Core Methods

#### WithAction() - Required

```csharp
builder.WithAction(AuditActionType.Created)
```

Sets the action type. **Required** for all events.

#### WithResource() - Required

```csharp
builder.WithResource(AuditResourceType.User, userId, displayName)
```

Sets the resource being acted upon. **Required** for all events.
- `resourceType`: The type of resource
- `resourceId`: The resource's unique identifier (UUID)
- `resourceName`: Optional human-readable name (for display)

#### WithActor() - Optional

```csharp
builder.WithActor(userId, displayName)
```

Sets the user performing the action. Optional for system-initiated events.

#### WithOrganization() - Optional

```csharp
builder.WithOrganization(organizationId, organizationName)
```

Sets the organization context. Use for all events within an organization scope.

#### WithIpAddress() - Optional

```csharp
builder.WithIpAddress(ipAddress)
```

Sets the actor's IP address. Typically used for authentication events.

#### WithCorrelationId() - Optional

```csharp
builder.WithCorrelationId(correlationId)
```

Sets a correlation ID for request tracing. Useful for debugging distributed operations.

### Outcome Methods

#### AsSuccess() - Default

```csharp
builder.AsSuccess()
```

Marks the event as successful. This is the default outcome if not specified.

#### AsFailure()

```csharp
builder.AsFailure("Reason for failure")
```

Marks the event as failed with a reason. Use for operational failures.
- Reason is truncated to 1000 characters if longer

#### AsDenied()

```csharp
builder.AsDenied("Reason for denial")
```

Marks the event as denied due to authorization. Use for permission failures.
- Reason is truncated to 1000 characters if longer

#### AsPartial()

```csharp
builder.AsPartial("Details about partial success")
```

Marks the event as partially successful. Use for batch operations with mixed results.

### Details Methods

#### WithDetails() - Object Serialization

```csharp
builder.WithDetails(new 
{
    field1 = "value1",
    field2 = 123,
    field3 = true
})
```

Serializes an object to JSON and stores in the `Details` field. This is the preferred method.

**Best Practices:**
- Use anonymous objects for ad-hoc details
- Use DTOs for consistent structures
- **Never include sensitive data** (passwords, secrets, API keys)
- Include only relevant information (not entire entities)

#### WithDetailsJson() - Raw JSON

```csharp
builder.WithDetailsJson("{\"custom\":\"json\"}")
```

Stores raw JSON string. Use only if you've already serialized the data.

### Build Method

```csharp
AuditEvent auditEvent = builder.Build();
```

Builds and validates the audit event. Throws `InvalidOperationException` if required fields are missing.

**Note:** When using `IAuditService.LogAsync(builder)`, you don't need to call `Build()` explicitly—the service does it for you.

---

## Common Patterns

### Pattern 1: Entity Creation

```csharp
try
{
    await auditService.LogAsync(
        new AuditEventBuilder()
            .WithActor(actorUserId, actorDisplayName)
            .WithAction(AuditActionType.Created)
            .WithResource(AuditResourceType.MyEntity, entity.Id, entity.Name)
            .WithOrganization(organizationId, organizationName) // If org-scoped
            .WithDetails(new { entity.Name, entity.Description })
            .AsSuccess(),
        cancellationToken);
}
catch (Exception ex)
{
    logger.LogWarning(ex, "Failed to audit entity creation");
}
```

### Pattern 2: Entity Update with Change Tracking

```csharp
// Track changes
var changedFields = new Dictionary<string, object>();

if (entity.Name != request.Name)
{
    changedFields["name"] = new { old = entity.Name, @new = request.Name };
}

if (entity.Description != request.Description)
{
    changedFields["description"] = new { old = entity.Description, @new = request.Description };
}

// Apply changes
entity.Name = request.Name;
entity.Description = request.Description;
await context.SaveChangesAsync(cancellationToken);

// Audit update
if (changedFields.Any())
{
    try
    {
        await auditService.LogAsync(
            new AuditEventBuilder()
                .WithActor(actorUserId, actorDisplayName)
                .WithAction(AuditActionType.Updated)
                .WithResource(AuditResourceType.MyEntity, entity.Id, entity.Name)
                .WithDetails(new { entityId = entity.Id, changedFields })
                .AsSuccess(),
            cancellationToken);
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to audit entity update");
    }
}
```

### Pattern 3: Entity Deletion

```csharp
// Capture name before deletion
var entityName = entity.Name;
var entityId = entity.Id;

context.MyEntities.Remove(entity);
await context.SaveChangesAsync(cancellationToken);

try
{
    await auditService.LogAsync(
        new AuditEventBuilder()
            .WithActor(actorUserId, actorDisplayName)
            .WithAction(AuditActionType.Deleted)
            .WithResource(AuditResourceType.MyEntity, entityId, entityName)
            .WithDetails(new { deletedName = entityName })
            .AsSuccess(),
        cancellationToken);
}
catch (Exception ex)
{
    logger.LogWarning(ex, "Failed to audit entity deletion");
}
```

### Pattern 4: Status Change

```csharp
var oldStatus = proposal.Status;
proposal.Status = ProposalStatus.Closed;
await context.SaveChangesAsync(cancellationToken);

try
{
    await auditService.LogAsync(
        new AuditEventBuilder()
            .WithActor(actorUserId, actorDisplayName)
            .WithAction(AuditActionType.StatusChanged)
            .WithResource(AuditResourceType.Proposal, proposal.Id, proposal.Title)
            .WithOrganization(proposal.OrganizationId, organization?.Name)
            .WithDetails(new
            {
                proposalId = proposal.Id,
                fromStatus = oldStatus.ToString(),
                toStatus = proposal.Status.ToString(),
                changedAt = DateTimeOffset.UtcNow
            })
            .AsSuccess(),
        cancellationToken);
}
catch (Exception ex)
{
    logger.LogWarning(ex, "Failed to audit status change");
}
```

### Pattern 5: Failed Operation

```csharp
try
{
    // Attempt operation
    await PerformOperationAsync();
}
catch (Exception ex)
{
    // Audit the failure
    try
    {
        await auditService.LogAsync(
            new AuditEventBuilder()
                .WithActor(actorUserId, actorDisplayName)
                .WithAction(AuditActionType.Created)
                .WithResource(AuditResourceType.MyEntity, Guid.Empty, "Unknown")
                .AsFailure($"Operation failed: {ex.Message}")
                .WithDetails(new { attemptedName = request.Name }),
            cancellationToken);
    }
    catch
    {
        // Suppress audit failures
    }

    // Re-throw original exception
    throw;
}
```

### Pattern 6: Authorization Denial (Automatic)

Authorization failures are **automatically captured** by `AuditingAuthorizationMiddleware`. You don't need to add explicit audit logging for 403 responses.

However, if you're performing custom authorization checks and want to audit them:

```csharp
if (!await authService.CanAccessResourceAsync(userId, resourceId))
{
    try
    {
        await auditService.LogAsync(
            new AuditEventBuilder()
                .WithActor(userId, displayName)
                .WithAction(AuditActionType.AuthorizationDenied)
                .WithResource(AuditResourceType.MyEntity, resourceId, resourceName)
                .AsDenied("User lacks required permission")
                .WithDetails(new { requiredPermission = "MyEntity.Read" }),
            cancellationToken);
    }
    catch
    {
        // Suppress audit failures
    }

    return Forbid();
}
```

### Pattern 7: System-Initiated Event (No Actor)

```csharp
await auditService.LogAsync(
    new AuditEventBuilder()
        // No WithActor() call - system-initiated
        .WithAction(AuditActionType.StatusChanged)
        .WithResource(AuditResourceType.Proposal, proposal.Id, proposal.Title)
        .WithOrganization(proposal.OrganizationId, organization?.Name)
        .WithDetails(new { reason = "Automatic closure at EndAt time" })
        .AsSuccess(),
    cancellationToken);
```

### Pattern 8: Masking Sensitive Data

```csharp
private static string MaskUrl(string url)
{
    try
    {
        var uri = new Uri(url);
        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            return url.Replace(uri.UserInfo, "****:****");
        }
        return url;
    }
    catch
    {
        return "****";
    }
}

await auditService.LogAsync(
    new AuditEventBuilder()
        .WithAction(AuditActionType.Created)
        .WithResource(AuditResourceType.WebhookEndpoint, endpoint.Id, MaskUrl(endpoint.Url))
        .WithDetails(new { endpointUrl = MaskUrl(endpoint.Url) })
        .AsSuccess(),
    cancellationToken);
```

---

## Testing Audit Events

### Integration Test Pattern

```csharp
using FanEngagement.Application.Audit;
using FanEngagement.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

public class MyEntityAuditTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public MyEntityAuditTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateMyEntity_GeneratesAuditEvent_WithCorrectDetails()
    {
        // Arrange
        var (userId, token) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(token);

        var request = new CreateMyEntityRequest
        {
            Name = $"Test Entity {Guid.NewGuid()}",
            Description = "Test description"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/my-entities", request);

        // Assert
        Assert.True(response.IsSuccessStatusCode);
        var entity = await response.Content.ReadFromJsonAsync<MyEntityDto>();
        Assert.NotNull(entity);

        // Wait for audit event to be persisted (asynchronous)
        using var scope = _factory.Services.CreateScope();
        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();

        var auditEvent = await WaitForAuditEventAsync(
            auditService,
            AuditResourceType.MyNewResource,
            entity!.Id,
            AuditActionType.Created);

        Assert.NotNull(auditEvent);
        Assert.Equal(AuditActionType.Created, auditEvent.ActionType);
        Assert.Equal(AuditResourceType.MyNewResource, auditEvent.ResourceType);
        Assert.Equal(entity.Id, auditEvent.ResourceId);
        Assert.Equal(entity.Name, auditEvent.ResourceName);
        Assert.Equal(AuditOutcome.Success, auditEvent.Outcome);
        Assert.Equal(userId, auditEvent.ActorUserId);

        // Verify details
        var details = await auditService.GetByIdAsync(auditEvent.Id);
        Assert.NotNull(details);
        Assert.Contains(request.Name, details!.Details ?? string.Empty);
        Assert.Contains(request.Description, details.Details ?? string.Empty);
    }

    /// <summary>
    /// Helper method to wait for an audit event to be persisted.
    /// Polls the audit service for up to 5 seconds.
    /// </summary>
    private async Task<AuditEventDto?> WaitForAuditEventAsync(
        IAuditService auditService,
        AuditResourceType resourceType,
        Guid resourceId,
        AuditActionType actionType,
        int maxAttempts = 10,
        int delayMs = 500)
    {
        for (int i = 0; i < maxAttempts; i++)
        {
            var query = new AuditQuery
            {
                ResourceTypes = new[] { resourceType },
                ResourceId = resourceId,
                ActionTypes = new[] { actionType },
                PageSize = 1
            };

            var result = await auditService.QueryAsync(query);
            if (result.Items.Any())
            {
                return result.Items.First();
            }

            await Task.Delay(delayMs);
        }

        return null;
    }
}
```

### Unit Test Pattern (Service Layer)

```csharp
using FanEngagement.Application.Audit;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Moq;
using Xunit;

public class MyEntityServiceTests
{
    [Fact]
    public async Task CreateAsync_LogsAuditEvent_OnSuccess()
    {
        // Arrange
        var mockContext = new Mock<ApplicationDbContext>();
        var mockAuditService = new Mock<IAuditService>();
        var mockLogger = new Mock<ILogger<MyEntityService>>();

        var service = new MyEntityService(
            mockContext.Object,
            mockAuditService.Object,
            mockLogger.Object);

        var request = new CreateMyEntityRequest
        {
            Name = "Test Entity",
            Description = "Test description"
        };

        // Act
        await service.CreateAsync(request, actorUserId, actorDisplayName, CancellationToken.None);

        // Assert
        mockAuditService.Verify(
            x => x.LogAsync(
                It.Is<AuditEventBuilder>(b =>
                    // Verify builder was called with correct parameters
                    // (Note: You may need to expose builder properties or use integration tests)
                    true),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateAsync_DoesNotThrow_WhenAuditLoggingFails()
    {
        // Arrange
        var mockContext = new Mock<ApplicationDbContext>();
        var mockAuditService = new Mock<IAuditService>();
        mockAuditService
            .Setup(x => x.LogAsync(It.IsAny<AuditEventBuilder>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Audit failure"));

        var mockLogger = new Mock<ILogger<MyEntityService>>();
        
        var service = new MyEntityService(
            mockContext.Object,
            mockAuditService.Object,
            mockLogger.Object);

        var request = new CreateMyEntityRequest { Name = "Test" };

        // Act & Assert
        var exception = await Record.ExceptionAsync(async () =>
            await service.CreateAsync(request, Guid.Empty, "", CancellationToken.None));

        // Audit failure should not propagate
        Assert.Null(exception);

        // But warning should be logged
        mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }
}
```

### Testing Best Practices

1. **Always wait for async persistence** in integration tests using the `WaitForAuditEventAsync` helper
2. **Test failure scenarios** to ensure audit failures don't break business logic
3. **Verify details content** to ensure sensitive data is not logged
4. **Test all outcomes** (Success, Failure, Denied, Partial)
5. **Check organization context** for org-scoped events
6. **Verify actor information** is correctly captured

---

## Best Practices

### 1. Error Handling

**DO:**
```csharp
try
{
    await auditService.LogAsync(builder, cancellationToken);
}
catch (Exception ex)
{
    logger.LogWarning(ex, "Failed to audit operation");
}
```

**DON'T:**
```csharp
// Never let audit failures break business logic
await auditService.LogAsync(builder, cancellationToken);
```

### 2. Sensitive Data

**DO:**
```csharp
.WithDetails(new { user.Email, user.DisplayName })
```

**DON'T:**
```csharp
// Never log passwords, API keys, secrets, etc.
.WithDetails(new { user.Email, user.Password }) // ❌ NEVER
```

### 3. Details Granularity

**DO:**
```csharp
.WithDetails(new 
{ 
    name = entity.Name,
    description = entity.Description,
    status = entity.Status.ToString()
})
```

**DON'T:**
```csharp
// Don't serialize entire entities (wastes space, includes internal fields)
.WithDetails(entity) // ❌ Too much
```

### 4. Masking

**DO:**
```csharp
private static string MaskEmail(string email)
{
    var parts = email.Split('@');
    if (parts.Length != 2) return "****@****";
    return $"{parts[0][0]}***@{parts[1]}";
}

.WithDetails(new { maskedEmail = MaskEmail(email) })
```

### 5. Change Tracking

**DO:**
```csharp
var changedFields = new Dictionary<string, object>();

if (entity.Name != request.Name)
    changedFields["name"] = new { old = entity.Name, @new = request.Name };

if (changedFields.Any())
    .WithDetails(new { changedFields })
```

**DON'T:**
```csharp
// Don't log updates with no actual changes
.WithDetails(new { oldValue = x, newValue = x }) // Pointless
```

### 6. Resource Naming

**DO:**
```csharp
// Use human-readable names
.WithResource(AuditResourceType.Proposal, proposal.Id, proposal.Title)
```

**DON'T:**
```csharp
// Don't use IDs or technical names
.WithResource(AuditResourceType.Proposal, proposal.Id, proposal.Id.ToString()) // ❌
```

### 7. Organization Context

**DO:**
```csharp
// Always include organization for org-scoped events
.WithOrganization(organizationId, organizationName)
```

**DON'T:**
```csharp
// Don't omit organization context for org-scoped resources
.WithResource(AuditResourceType.Proposal, proposal.Id)
// Missing organization context! ❌
```

### 8. Actor Information

**DO:**
```csharp
// Include actor for user-initiated actions
.WithActor(userId, displayName)

// Omit actor for system-initiated actions
// (no WithActor() call)
```

**DON'T:**
```csharp
// Don't use fake actors
.WithActor(Guid.Empty, "System") // ❌ Just omit WithActor()
```

---

## Troubleshooting Guide

### Problem: Audit events are not appearing in the database

**Possible Causes:**

1. **Channel is full** (1000 events capacity)
   - **Solution:** Check logs for warnings about dropped events
   - **Prevention:** Increase channel capacity in `AuditOptions.ChannelCapacity`

2. **Background service is not running**
   - **Solution:** Check application logs for background service startup
   - **Prevention:** Ensure `AuditPersistenceBackgroundService` is registered in DI

3. **Database connection issue**
   - **Solution:** Check connection string and database availability
   - **Prevention:** Monitor database health

4. **Audit event validation failed**
   - **Solution:** Ensure required fields (ActionType, ResourceType, ResourceId) are set
   - **Prevention:** Use `AuditEventBuilder` which validates at build time

### Problem: Audit logging is slowing down my service

**Possible Causes:**

1. **Using `LogSyncAsync` instead of `LogAsync`**
   - **Solution:** Use `LogAsync` for fire-and-forget logging
   - **Prevention:** Only use `LogSyncAsync` for critical transactional events

2. **Not catching audit exceptions**
   - **Solution:** Wrap audit calls in try-catch
   - **Prevention:** Follow error handling best practices

### Problem: Sensitive data is appearing in audit logs

**Possible Causes:**

1. **Logging entire entities or request objects**
   - **Solution:** Use anonymous objects with specific fields
   - **Prevention:** Code review checklist for sensitive data

2. **Not masking URLs with credentials**
   - **Solution:** Use masking helper functions
   - **Prevention:** Test audit events in development

### Problem: Test is flaky - audit event sometimes not found

**Possible Causes:**

1. **Not waiting for async persistence**
   - **Solution:** Use `WaitForAuditEventAsync` helper with appropriate timeout
   - **Prevention:** Always poll for audit events in tests

2. **Audit service is mocked/disabled in test environment**
   - **Solution:** Verify `IAuditService` is properly registered in test factory
   - **Prevention:** Check `TestWebApplicationFactory` configuration

### Problem: Too many audit events are being generated

**Possible Causes:**

1. **Logging read operations**
   - **Solution:** Only log write operations and auth failures by default
   - **Prevention:** Read operations should only be audited for compliance (e.g., PII access)

2. **Logging every field update**
   - **Solution:** Group related updates into a single event with change tracking
   - **Prevention:** Audit at business operation level, not field level

---

## Performance Considerations

### Asynchronous Logging

- **Default mode:** Fire-and-forget via bounded channel
- **Overhead:** <1ms per event in business operation
- **Throughput:** 10,000+ events/second with default settings

### Synchronous Logging

- **Use case:** Critical events requiring atomic commit
- **Overhead:** +10-50ms per event (database roundtrip)
- **Recommendation:** Use sparingly

### Channel Capacity

- **Default:** 1000 events
- **Overflow:** Oldest events are dropped (warning logged)
- **Tuning:** Increase capacity if logs show dropped events

```json
{
  "Audit": {
    "ChannelCapacity": 5000  // Increase for high-volume systems
  }
}
```

### Batch Persistence

- **Default:** 10 events per batch
- **Frequency:** Dequeue every 100ms
- **Tuning:** Increase batch size for higher throughput

```json
{
  "Audit": {
    "BatchSize": 50  // Larger batches = fewer DB roundtrips
  }
}
```

### Query Performance

- **Always filter by date range** to use indexes efficiently
- **Use `StreamEventsAsync`** for large exports (memory-efficient)
- **Exports are rate-limited** to prevent abuse

---

## Related Documentation

- **[Architecture Overview](./architecture.md)** - System design and component architecture
- **[Event Catalog](./events.md)** - Complete list of all audit events
- **[Operations Guide](./operations.md)** - Production configuration and monitoring
- **[Data Model](./data-model.md)** - Entity schema and indexes
- **[Event Categorization](./event-categorization.md)** - Enum definitions

---

## Quick Reference

### Common Imports

```csharp
using FanEngagement.Application.Audit;
using FanEngagement.Domain.Enums;
```

### Builder Cheat Sheet

```csharp
await auditService.LogAsync(
    new AuditEventBuilder()
        .WithActor(userId, displayName)              // Optional: Who
        .WithAction(AuditActionType.Created)         // Required: What
        .WithResource(ResourceType, id, name)        // Required: On What
        .WithOrganization(orgId, orgName)            // Optional: Where
        .WithIpAddress(ipAddress)                    // Optional: From Where
        .WithCorrelationId(correlationId)            // Optional: Request ID
        .WithDetails(new { field = "value" })        // Optional: Additional Info
        .AsSuccess(),                                // Optional: Outcome (default)
    cancellationToken);
```

### Test Helper

```csharp
private async Task<AuditEventDto?> WaitForAuditEventAsync(
    IAuditService auditService,
    AuditResourceType resourceType,
    Guid resourceId,
    AuditActionType actionType)
{
    for (int i = 0; i < 10; i++)
    {
        var query = new AuditQuery
        {
            ResourceTypes = new[] { resourceType },
            ResourceId = resourceId,
            ActionTypes = new[] { actionType },
            PageSize = 1
        };

        var result = await auditService.QueryAsync(query);
        if (result.Items.Any())
            return result.Items.First();

        await Task.Delay(500);
    }
    return null;
}
```
