# Audit Event Categorization

> **Document Type:** Architecture Design  
> **Epic:** E-005 - Implement Thorough Audit Logging Across the Application  
> **Issue:** E-005-03  
> **Status:** Complete  
> **Last Updated:** November 28, 2024  
> **Depends On:** E-005-01 (Audit Data Model)  
> **Dependency For:** E-005-06 through E-005-15 (Event Capture Stories)

## Executive Summary

This document defines the audit event categorization scheme for FanEngagement, establishing a consistent taxonomy for classifying and querying audit events across the application. The categorization is built around three core dimensions:

1. **ActionType** - What action was performed (verb-based)
2. **ResourceType** - What resource was affected (noun-based)
3. **Outcome** - What was the result of the action attempt

This scheme ensures:
- **Consistency**: All auditable actions follow the same classification pattern
- **Queryability**: Events can be efficiently filtered and aggregated
- **Extensibility**: New event types can be added without breaking existing patterns
- **Clarity**: The combination of ActionType + ResourceType + Outcome fully describes any audit event

---

## Table of Contents

1. [ActionType Enum Definition](#1-actiontype-enum-definition)
2. [ResourceType Enum Definition](#2-resourcetype-enum-definition)
3. [Outcome Enum Definition](#3-outcome-enum-definition)
4. [Categorization Matrix](#4-categorization-matrix)
5. [Examples by Category](#5-examples-by-category)
6. [Extensibility Guidelines](#6-extensibility-guidelines)
7. [Read Operation Considerations](#7-read-operation-considerations)
8. [References](#8-references)

---

## 1. ActionType Enum Definition

The `ActionType` enum categorizes **what action was performed**. Values are verb-based and action-oriented.

### 1.1 Enum Values

```csharp
public enum ActionType : short
{
    // Resource Lifecycle (1-9)
    Created = 1,
    Updated = 2,
    Deleted = 3,
    
    // Access and Views (10-19)
    Accessed = 10,
    Exported = 11,
    
    // Status and State Changes (20-29)
    StatusChanged = 20,
    RoleChanged = 21,
    
    // Authentication and Authorization (30-39)
    Authenticated = 30,
    AuthorizationDenied = 31,
    
    // Reserved for future extensibility (100+)
}
```

### 1.2 ActionType Descriptions

| Value | Name | Category | Description | When to Use |
|-------|------|----------|-------------|-------------|
| 1 | `Created` | Resource Lifecycle | A new resource was created | User registration, proposal creation, vote cast, share issuance |
| 2 | `Updated` | Resource Lifecycle | An existing resource was modified | Profile updates, proposal edits, webhook configuration changes |
| 3 | `Deleted` | Resource Lifecycle | A resource was removed | User deletion, membership removal, webhook deletion |
| 10 | `Accessed` | Access & Views | A resource was read or viewed | Viewing audit logs, accessing sensitive configuration |
| 11 | `Exported` | Access & Views | Data was exported from the system | CSV/JSON export of audit events, member list exports |
| 20 | `StatusChanged` | State Changes | A status transition occurred | Proposal Draft→Open→Closed→Finalized, outbound event status changes |
| 21 | `RoleChanged` | State Changes | A user's role was modified | Member→OrgAdmin promotion, Admin→User demotion |
| 30 | `Authenticated` | Auth Events | An authentication event occurred | Login success, login failure, token refresh, logout |
| 31 | `AuthorizationDenied` | Auth Events | Access was denied by authorization | 403 Forbidden responses, policy violations |

### 1.3 ActionType Selection Guide

```
Is this a new resource being created?
    → ActionType.Created

Is this an existing resource being modified?
    ├─ Is it a status/state transition? → ActionType.StatusChanged
    ├─ Is it a role change? → ActionType.RoleChanged
    └─ Otherwise → ActionType.Updated

Is this a resource being removed?
    → ActionType.Deleted

Is this a read operation?
    ├─ Is data being exported? → ActionType.Exported
    └─ Is it sensitive data access? → ActionType.Accessed

Is this an authentication event?
    → ActionType.Authenticated

Is this an authorization failure?
    → ActionType.AuthorizationDenied
```

---

## 2. ResourceType Enum Definition

The `ResourceType` enum categorizes **what resource was affected**. Values are noun-based and entity-oriented.

### 2.1 Enum Values

```csharp
public enum ResourceType : short
{
    // Core Entities (1-9)
    User = 1,
    Organization = 2,
    Membership = 3,
    
    // Share Management (10-19)
    ShareType = 10,
    ShareIssuance = 11,
    ShareBalance = 12,
    
    // Governance (20-29)
    Proposal = 20,
    ProposalOption = 21,
    Vote = 22,
    
    // Integrations (30-39)
    WebhookEndpoint = 30,
    OutboundEvent = 31,
    
    // System (100+)
    SystemConfiguration = 100,
    
    // Reserved for future extensibility (200+)
}
```

### 2.2 ResourceType Descriptions

| Value | Name | Domain | Description | Associated Actions |
|-------|------|--------|-------------|-------------------|
| 1 | `User` | Core | Platform user account | Created, Updated, Deleted, Authenticated, RoleChanged |
| 2 | `Organization` | Core | Organization/tenant entity | Created, Updated, Deleted |
| 3 | `Membership` | Core | User-Organization membership | Created, Deleted, RoleChanged |
| 10 | `ShareType` | Shares | Share type definition | Created, Updated, Deleted |
| 11 | `ShareIssuance` | Shares | Record of shares issued | Created |
| 12 | `ShareBalance` | Shares | User's current balance | Updated (implicit via issuance) |
| 20 | `Proposal` | Governance | Governance proposal | Created, Updated, Deleted, StatusChanged |
| 21 | `ProposalOption` | Governance | Voting option within a proposal | Created, Deleted |
| 22 | `Vote` | Governance | Vote cast on a proposal | Created |
| 30 | `WebhookEndpoint` | Integrations | Registered webhook URL | Created, Updated, Deleted |
| 31 | `OutboundEvent` | Integrations | Queued event for delivery | Created, Updated (retry), StatusChanged |
| 100 | `SystemConfiguration` | System | Platform-level settings | Updated, Accessed, Exported |

### 2.3 Resource Domain Groupings

| Domain | Resource Types | Description |
|--------|---------------|-------------|
| **Core** | User, Organization, Membership | Platform foundation entities |
| **Shares** | ShareType, ShareIssuance, ShareBalance | Share/token management |
| **Governance** | Proposal, ProposalOption, Vote | Voting and governance |
| **Integrations** | WebhookEndpoint, OutboundEvent | External system integrations |
| **System** | SystemConfiguration | Platform configuration and admin |

---

## 3. Outcome Enum Definition

The `Outcome` enum captures **the result of the action attempt**.

### 3.1 Enum Values

```csharp
public enum Outcome : short
{
    Success = 1,
    Failure = 2,
    Denied = 3,
    Partial = 4,
}
```

### 3.2 Outcome Descriptions

| Value | Name | Description | HTTP Status Correlation | Example Scenarios |
|-------|------|-------------|------------------------|-------------------|
| 1 | `Success` | Action completed successfully | 2xx responses | Vote cast, proposal created, login successful |
| 2 | `Failure` | Action failed due to an error | 4xx (validation), 5xx (server) | Validation error, database error, business rule violation |
| 3 | `Denied` | Action blocked by authorization | 401, 403 responses | Insufficient permissions, unauthorized access attempt |
| 4 | `Partial` | Action partially completed | Batch operations | Bulk import with some failures, partial webhook delivery |

### 3.3 Outcome Selection Guide

```
Did the action complete successfully?
    → Outcome.Success

Was the action blocked before execution?
    ├─ Due to authentication failure? → Outcome.Denied (with ActionType.Authenticated)
    └─ Due to authorization failure? → Outcome.Denied (with ActionType.AuthorizationDenied)

Did the action fail during execution?
    ├─ Complete failure? → Outcome.Failure
    └─ Partial success (batch)? → Outcome.Partial
```

---

## 4. Categorization Matrix

This matrix maps common actions to their categorization, providing a reference for consistent event classification.

### 4.1 User Management Events

| Action | ActionType | ResourceType | Outcome | Notes |
|--------|------------|--------------|---------|-------|
| User registers | Created | User | Success/Failure | Includes registration source |
| User profile updated | Updated | User | Success/Failure | Includes changed fields |
| User deleted | Deleted | User | Success/Failure | Deleted by admin |
| User global role changed | RoleChanged | User | Success/Failure | Admin→User or User→Admin |

### 4.2 Authentication Events

| Action | ActionType | ResourceType | Outcome | Notes |
|--------|------------|--------------|---------|-------|
| Login success | Authenticated | User | Success | Includes IP, user agent |
| Login failure | Authenticated | User | Failure | Includes failure reason |
| Token refresh | Authenticated | User | Success/Failure | Token renewal |
| Logout | Authenticated | User | Success | Voluntary session end |

### 4.3 Authorization Events

| Action | ActionType | ResourceType | Outcome | Notes |
|--------|------------|--------------|---------|-------|
| 403 Forbidden response | AuthorizationDenied | (varies) | Denied | Includes endpoint, required role |
| Policy violation | AuthorizationDenied | (varies) | Denied | Specific policy that denied access |

### 4.4 Organization Management Events

| Action | ActionType | ResourceType | Outcome | Notes |
|--------|------------|--------------|---------|-------|
| Organization created | Created | Organization | Success/Failure | Creator becomes OrgAdmin |
| Organization updated | Updated | Organization | Success/Failure | Includes changed fields |
| Organization deleted | Deleted | Organization | Success/Failure | (Future: soft delete) |

### 4.5 Membership Events

| Action | ActionType | ResourceType | Outcome | Notes |
|--------|------------|--------------|---------|-------|
| Member added to org | Created | Membership | Success/Failure | Includes assigned role |
| Member removed from org | Deleted | Membership | Success/Failure | Removed by whom |
| Member role changed | RoleChanged | Membership | Success/Failure | Previous and new role |

### 4.6 Share Management Events

| Action | ActionType | ResourceType | Outcome | Notes |
|--------|------------|--------------|---------|-------|
| Share type created | Created | ShareType | Success/Failure | Name, symbol, voting weight |
| Share type updated | Updated | ShareType | Success/Failure | Changed fields |
| Share type deleted | Deleted | ShareType | Success/Failure | |
| Shares issued | Created | ShareIssuance | Success/Failure | Quantity, recipient |

### 4.7 Governance Events

| Action | ActionType | ResourceType | Outcome | Notes |
|--------|------------|--------------|---------|-------|
| Proposal created | Created | Proposal | Success/Failure | Title, organization |
| Proposal updated | Updated | Proposal | Success/Failure | Changed fields |
| Proposal opened | StatusChanged | Proposal | Success/Failure | Draft→Open, eligible voting power |
| Proposal closed | StatusChanged | Proposal | Success/Failure | Open→Closed, results |
| Proposal finalized | StatusChanged | Proposal | Success/Failure | Closed→Finalized |
| Option added | Created | ProposalOption | Success/Failure | Option text |
| Option deleted | Deleted | ProposalOption | Success/Failure | Only in Draft status |
| Vote cast | Created | Vote | Success/Failure | Option, voting power |

### 4.8 Webhook Events

| Action | ActionType | ResourceType | Outcome | Notes |
|--------|------------|--------------|---------|-------|
| Webhook created | Created | WebhookEndpoint | Success/Failure | URL (partial), subscribed events |
| Webhook updated | Updated | WebhookEndpoint | Success/Failure | Changed fields |
| Webhook deleted | Deleted | WebhookEndpoint | Success/Failure | |
| Event retry | Updated | OutboundEvent | Success/Failure | Previous and new status |

### 4.9 Admin & System Events

| Action | ActionType | ResourceType | Outcome | Notes |
|--------|------------|--------------|---------|-------|
| Audit log viewed | Accessed | SystemConfiguration | Success | Query filters used |
| Audit log exported | Exported | SystemConfiguration | Success | Format, date range |
| System config changed | Updated | SystemConfiguration | Success/Failure | (Future) |

---

## 5. Examples by Category

### 5.1 Resource Lifecycle Events (Created, Updated, Deleted)

**User Created (Registration)**
```json
{
  "actionType": "Created",
  "resourceType": "User",
  "outcome": "Success",
  "resourceId": "user-guid",
  "resourceName": "john.doe@example.com",
  "details": {
    "email": "john.doe@example.com",
    "displayName": "John Doe",
    "registrationSource": "web"
  }
}
```

**Proposal Updated**
```json
{
  "actionType": "Updated",
  "resourceType": "Proposal",
  "outcome": "Success",
  "resourceId": "proposal-guid",
  "resourceName": "Q4 Budget Allocation",
  "organizationId": "org-guid",
  "details": {
    "changedFields": ["title", "description", "quorumRequirement"],
    "previousTitle": "Budget Proposal",
    "newTitle": "Q4 Budget Allocation"
  }
}
```

**Membership Deleted**
```json
{
  "actionType": "Deleted",
  "resourceType": "Membership",
  "outcome": "Success",
  "resourceId": "membership-guid",
  "resourceName": "john.doe@example.com",
  "organizationId": "org-guid",
  "details": {
    "removedUserId": "user-guid",
    "removedUserDisplayName": "John Doe",
    "removedByUserId": "admin-guid"
  }
}
```

### 5.2 State Change Events (StatusChanged, RoleChanged)

**Proposal Status Changed (Open)**
```json
{
  "actionType": "StatusChanged",
  "resourceType": "Proposal",
  "outcome": "Success",
  "resourceId": "proposal-guid",
  "resourceName": "Q4 Budget Allocation",
  "organizationId": "org-guid",
  "details": {
    "previousStatus": "Draft",
    "newStatus": "Open",
    "eligibleVotingPowerSnapshot": 15000.0,
    "optionCount": 3
  }
}
```

**Membership Role Changed**
```json
{
  "actionType": "RoleChanged",
  "resourceType": "Membership",
  "outcome": "Success",
  "resourceId": "membership-guid",
  "resourceName": "john.doe@example.com",
  "organizationId": "org-guid",
  "details": {
    "targetUserId": "user-guid",
    "targetUserDisplayName": "John Doe",
    "previousRole": "Member",
    "newRole": "OrgAdmin",
    "isPrivilegeEscalation": true
  }
}
```

### 5.3 Authentication Events (Authenticated)

**Login Success**
```json
{
  "actionType": "Authenticated",
  "resourceType": "User",
  "outcome": "Success",
  "actorUserId": "user-guid",
  "actorDisplayName": "John Doe",
  "actorIpAddress": "192.168.1.100",
  "resourceId": "user-guid",
  "resourceName": "john.doe@example.com",
  "details": {
    "method": "password",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Login Failure**
```json
{
  "actionType": "Authenticated",
  "resourceType": "User",
  "outcome": "Failure",
  "actorIpAddress": "192.168.1.100",
  "resourceId": "deterministic-guid-from-email",
  "resourceName": "unknown@example.com",
  "details": {
    "email": "unknown@example.com",
    "reason": "InvalidCredentials",
    "attemptCount": 3
  },
  "failureReason": "Invalid email or password"
}
```

### 5.4 Authorization Events (AuthorizationDenied)

**403 Forbidden**
```json
{
  "actionType": "AuthorizationDenied",
  "resourceType": "Proposal",
  "outcome": "Denied",
  "actorUserId": "user-guid",
  "actorDisplayName": "John Doe",
  "resourceId": "org-guid",
  "resourceName": "/organizations/{orgId}/proposals",
  "organizationId": "org-guid",
  "details": {
    "endpoint": "/organizations/{orgId}/proposals",
    "method": "POST",
    "requiredRole": "OrgAdmin",
    "actualRole": "Member",
    "policy": "RequireOrgAdmin"
  },
  "failureReason": "User lacks OrgAdmin role for this organization"
}
```

### 5.5 Governance Events (Vote Cast)

**Vote Cast**
```json
{
  "actionType": "Created",
  "resourceType": "Vote",
  "outcome": "Success",
  "actorUserId": "user-guid",
  "actorDisplayName": "Jane Smith",
  "resourceId": "vote-guid",
  "resourceName": "Vote on Q4 Budget Allocation",
  "organizationId": "org-guid",
  "details": {
    "proposalId": "proposal-guid",
    "proposalTitle": "Q4 Budget Allocation",
    "optionId": "option-guid",
    "optionText": "Approve Budget",
    "votingPower": 150.0
  }
}
```

### 5.6 Access Events (Accessed, Exported)

**Audit Log Accessed**
```json
{
  "actionType": "Accessed",
  "resourceType": "SystemConfiguration",
  "outcome": "Success",
  "actorUserId": "admin-guid",
  "actorDisplayName": "Admin User",
  "resourceId": "deterministic-guid-for-audit-access",
  "resourceName": "Audit Log",
  "organizationId": "org-guid",
  "details": {
    "queryFilters": {
      "dateFrom": "2024-11-01",
      "dateTo": "2024-11-15",
      "actionType": "StatusChanged"
    },
    "resultCount": 47
  }
}
```

**Audit Log Exported**
```json
{
  "actionType": "Exported",
  "resourceType": "SystemConfiguration",
  "outcome": "Success",
  "actorUserId": "admin-guid",
  "actorDisplayName": "Admin User",
  "resourceId": "deterministic-guid-for-audit-export",
  "resourceName": "Audit Log Export",
  "organizationId": "org-guid",
  "details": {
    "format": "CSV",
    "dateRange": {
      "from": "2024-11-01",
      "to": "2024-11-15"
    },
    "eventCount": 1250,
    "fileSize": "256KB"
  }
}
```

---

## 6. Extensibility Guidelines

This section provides guidelines for adding new event types as the platform evolves.

### 6.1 Adding a New ActionType

**When to Add:**
- Existing action types don't adequately describe the action
- The new action type is semantically distinct and reusable
- Multiple resources would benefit from the new action type

**Steps:**
1. **Choose a Value Range**: Use the next available value in the appropriate category:
   - Resource Lifecycle: 1-9
   - Access & Views: 10-19
   - State Changes: 20-29
   - Auth Events: 30-39
   - Custom/Domain-Specific: 100+

2. **Update Enum**: Add the new value with XML documentation
   ```csharp
   /// <summary>
   /// Resource was archived (soft-deleted but recoverable).
   /// </summary>
   Archived = 4,
   ```

3. **Update Documentation**: Add the new value to this document's tables and examples

4. **Update Mapping**: Add entries to the categorization matrix

5. **Migration Note**: New enum values are backward-compatible (no schema change needed)

### 6.2 Adding a New ResourceType

**When to Add:**
- A new entity type is being introduced to the domain
- The entity requires audit trail tracking
- No existing resource type adequately represents it

**Steps:**
1. **Choose a Value Range**: Use the next available value in the appropriate domain:
   - Core Entities: 1-9
   - Share Management: 10-19
   - Governance: 20-29
   - Integrations: 30-39
   - System: 100+
   - Custom/Domain-Specific: 200+

2. **Update Enum**: Add the new value with XML documentation
   ```csharp
   /// <summary>
   /// Delegation of voting power to another user.
   /// </summary>
   VoteDelegation = 23,
   ```

3. **Define Applicable Actions**: Document which ActionTypes apply to this resource

4. **Update Documentation**: Add the resource to domain groupings and matrix

5. **Plan Details Schema**: Define the JSON structure for Details field for events involving this resource

### 6.3 Adding a New Outcome

**When to Add:**
- Rarely needed; existing outcomes cover most scenarios
- Consider only if a new outcome is fundamentally different

**Potential Future Outcomes:**
- `Pending` - Action is queued for later execution
- `Cancelled` - Action was cancelled before completion
- `Timeout` - Action failed due to timeout

### 6.4 Backward Compatibility

**Adding New Values:**
- New enum values can be added without breaking existing code
- Old events retain their original values
- Queries filter by explicit values, so new values won't appear unexpectedly

**Removing/Renaming Values:**
- **Never remove** an enum value once in production
- **Never change** the numeric value of an existing enum
- To deprecate: Add `[Obsolete]` attribute and document migration path

### 6.5 Versioning Strategy

The categorization scheme follows semantic versioning principles:

| Change Type | Version Impact | Example |
|-------------|----------------|---------|
| Add new enum value | Minor version | Add `Archived` ActionType |
| Add new resource domain | Minor version | Add `Notifications` domain |
| Change enum value description | Patch version | Clarify `Accessed` usage |
| Remove enum value | Major version (avoid) | — |
| Change enum numeric value | Major version (avoid) | — |

---

## 7. Read Operation Considerations

### 7.1 High-Volume Implications

Capturing read operations (e.g., every API GET request) has significant implications:

| Aspect | Impact |
|--------|--------|
| **Storage** | 10-100x increase in audit event volume |
| **Performance** | Additional I/O for every read operation |
| **Signal-to-Noise** | Important events may be obscured by volume |
| **Cost** | Storage and query costs increase significantly |

### 7.2 Recommended Approach

**Selective Capture**: Only audit reads that are:
1. **Security-sensitive**: Accessing PII, viewing audit logs, exporting data
2. **Compliance-required**: Specific regulatory requirements
3. **Operationally important**: Admin views, configuration access

**Not Recommended**: General-purpose reads like:
- Listing proposals (public data)
- Viewing organization details
- Browsing share types

### 7.3 Read Audit Decision Matrix

| Resource/Action | Audit? | Rationale |
|-----------------|--------|-----------|
| View user profile (own) | No | High volume, low value |
| View user profile (other) | Optional | Privacy consideration |
| List organization members | No | High volume, operational |
| View audit logs | **Yes** | Security-sensitive |
| Export any data | **Yes** | Data exfiltration risk |
| View sensitive config | **Yes** | Security-sensitive |
| View proposal (public) | No | High volume, public data |
| View vote results | No | High volume, public data |

### 7.4 Configuration for Read Auditing

If read auditing is enabled for specific scenarios:

```json
{
  "Audit": {
    "ReadAuditEnabled": true,
    "ReadAuditResources": [
      "SystemConfiguration"
    ],
    "ReadAuditActions": [
      "Accessed",
      "Exported"
    ]
  }
}
```

---

## 8. References

### 8.1 Related Documents

- [E-005-01: Audit Data Model](data-model.md) - Entity schema and database design
- [E-005-02: Audit Service Architecture](service-architecture.md) - Service design and integration points
- [E-005 Epic](../product/archive/E-005-audit-logging.md) - Full epic definition and story breakdown

### 8.2 External Standards

| Standard | Relevance |
|----------|-----------|
| [NIST SP 800-92](https://csrc.nist.gov/publications/detail/sp/800-92/final) | Guide to Computer Security Log Management |
| [ISO 27001:2022 A.12.4](https://www.iso.org/standard/27001) | Logging and monitoring controls |
| [SOC 2 CC7.2](https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/aaboristemcontrols) | Security event logging criteria |

### 8.3 Appendix: Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIT EVENT CLASSIFICATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ActionType (WHAT HAPPENED)                                     │
│  ─────────────────────────                                      │
│  Created (1)      │ New resource created                        │
│  Updated (2)      │ Resource modified                           │
│  Deleted (3)      │ Resource removed                            │
│  Accessed (10)    │ Resource viewed (sensitive)                 │
│  Exported (11)    │ Data exported                               │
│  StatusChanged (20) │ Status transition                         │
│  RoleChanged (21) │ Role modified                               │
│  Authenticated (30) │ Auth event                                │
│  AuthorizationDenied (31) │ Access denied                       │
│                                                                  │
│  ResourceType (WHAT WAS AFFECTED)                               │
│  ───────────────────────────────                                │
│  User (1)         │ Organization (2)   │ Membership (3)         │
│  ShareType (10)   │ ShareIssuance (11) │ ShareBalance (12)      │
│  Proposal (20)    │ ProposalOption (21)│ Vote (22)              │
│  WebhookEndpoint (30) │ OutboundEvent (31)                      │
│  SystemConfiguration (100)                                       │
│                                                                  │
│  Outcome (WHAT WAS THE RESULT)                                  │
│  ─────────────────────────────                                  │
│  Success (1)      │ Action completed                            │
│  Failure (2)      │ Action failed                               │
│  Denied (3)       │ Access blocked                              │
│  Partial (4)      │ Partial success                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
