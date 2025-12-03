# Audit Events Catalog

> **Document Type:** Reference Documentation  
> **Epic:** E-005 - Implement Thorough Audit Logging Across the Application  
> **Status:** Complete  
> **Last Updated:** December 3, 2024

## Executive Summary

This document provides a comprehensive catalog of all audit events captured by the FanEngagement platform. Each event is documented with its ActionType, ResourceType, trigger conditions, details structure, and example event JSON.

Events are organized by functional category for easy reference:
- User Management
- Authentication
- Authorization
- Organization Management
- Membership Management
- Share Management
- Proposal Lifecycle
- Voting
- Webhook Management
- Admin Actions

---

## Table of Contents

1. [Event Categorization Matrix](#event-categorization-matrix)
2. [User Management Events](#user-management-events)
3. [Authentication Events](#authentication-events)
4. [Authorization Events](#authorization-events)
5. [Organization Management Events](#organization-management-events)
6. [Membership Management Events](#membership-management-events)
7. [Share Management Events](#share-management-events)
8. [Proposal Lifecycle Events](#proposal-lifecycle-events)
9. [Voting Events](#voting-events)
10. [Webhook Management Events](#webhook-management-events)
11. [Admin Actions](#admin-actions)
12. [Event Details Schema Reference](#event-details-schema-reference)

---

## Event Categorization Matrix

This matrix shows all combinations of ActionType and ResourceType currently implemented:

| ResourceType | Created | Updated | Deleted | StatusChanged | RoleChanged | Authenticated | AuthorizationDenied | Accessed | Exported | Admin* |
|--------------|---------|---------|---------|---------------|-------------|---------------|---------------------|----------|----------|--------|
| User | ✅ | ✅ | ✅ | - | ✅ | ✅ | - | - | - | - |
| Organization | ✅ | ✅ | - | - | - | - | - | - | - | - |
| Membership | ✅ | - | ✅ | - | ✅ | - | - | - | - | - |
| ShareType | ✅ | ✅ | ✅ | - | - | - | - | - | - | - |
| ShareIssuance | ✅ | - | - | - | - | - | - | - | - | - |
| ShareBalance | - | ✅ | - | - | - | - | - | - | - | - |
| Proposal | ✅ | ✅ | - | ✅ | - | - | - | - | - | - |
| ProposalOption | ✅ | - | - | - | - | - | - | - | - | - |
| Vote | ✅ | - | - | - | - | - | - | - | - | - |
| WebhookEndpoint | ✅ | ✅ | ✅ | - | - | - | - | - | - | - |
| OutboundEvent | - | - | - | ✅ | - | - | - | - | - | - |
| AuditEvent | - | - | - | - | - | - | - | ✅ | ✅ | ✅ |
| SystemConfiguration | - | - | - | - | - | - | ✅ | - | - | ✅ |

*Admin includes: `AdminDataSeeded`, `AdminDataReset`, `AdminDataCleanup`

---

## User Management Events

### User Created

Logged when a new user registers or is created by an admin.

- **ActionType:** `Created`
- **ResourceType:** `User`
- **Trigger:** `POST /users` (user registration)
- **Actor:** None (self-registration) or Admin (admin-created users)

**Details Structure:**

```json
{
  "email": "user@example.com",
  "displayName": "John Doe",
  "role": "User"
}
```

**Note:** Password is NEVER included in audit details.

**Example Event:**

```json
{
  "id": "7f3e8d92-1a4b-4e8c-9d7a-2b4c5e6f7g8h",
  "timestamp": "2024-12-03T10:30:00Z",
  "actorUserId": null,
  "actorDisplayName": null,
  "actorIpAddress": null,
  "actionType": "Created",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "User",
  "resourceId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "resourceName": "John Doe",
  "organizationId": null,
  "organizationName": null,
  "details": "{\"email\":\"user@example.com\",\"displayName\":\"John Doe\",\"role\":\"User\"}",
  "correlationId": null
}
```

---

### User Updated

Logged when a user's profile information is updated.

- **ActionType:** `Updated`
- **ResourceType:** `User`
- **Trigger:** `PUT /users/{id}` (profile update)
- **Actor:** Admin or the user themselves

**Details Structure:**

```json
{
  "userId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "changedFields": {
    "email": {
      "old": "old@example.com",
      "new": "new@example.com"
    },
    "displayName": {
      "old": "Old Name",
      "new": "New Name"
    }
  }
}
```

**Example Event:**

```json
{
  "id": "8a9b0c1d-2e3f-4g5h-6i7j-8k9l0m1n2o3p",
  "timestamp": "2024-12-03T11:45:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Admin User",
  "actorIpAddress": "192.168.1.100",
  "actionType": "Updated",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "User",
  "resourceId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "resourceName": "New Name",
  "organizationId": null,
  "organizationName": null,
  "details": "{\"userId\":\"a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6\",\"changedFields\":{\"email\":{\"old\":\"old@example.com\",\"new\":\"new@example.com\"},\"displayName\":{\"old\":\"Old Name\",\"new\":\"New Name\"}}}",
  "correlationId": "req-12345"
}
```

---

### User Role Changed

Logged when a user's role is changed (e.g., User → GlobalAdmin).

- **ActionType:** `RoleChanged`
- **ResourceType:** `User`
- **Trigger:** `PATCH /users/{id}/role` (role change)
- **Actor:** GlobalAdmin

**Details Structure:**

```json
{
  "oldRole": "User",
  "newRole": "GlobalAdmin"
}
```

**Example Event:**

```json
{
  "id": "9b0c1d2e-3f4g-5h6i-7j8k-9l0m1n2o3p4q",
  "timestamp": "2024-12-03T14:20:00Z",
  "actorUserId": "c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8",
  "actorDisplayName": "Super Admin",
  "actorIpAddress": "10.0.0.50",
  "actionType": "RoleChanged",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "User",
  "resourceId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "resourceName": "John Doe",
  "organizationId": null,
  "organizationName": null,
  "details": "{\"oldRole\":\"User\",\"newRole\":\"GlobalAdmin\"}",
  "correlationId": null
}
```

---

### User Deleted

Logged when a user account is deleted.

- **ActionType:** `Deleted`
- **ResourceType:** `User`
- **Trigger:** `DELETE /users/{id}` (account deletion)
- **Actor:** GlobalAdmin or the user themselves

**Details Structure:**

```json
{
  "email": "deleted@example.com",
  "displayName": "Deleted User"
}
```

**Example Event:**

```json
{
  "id": "0c1d2e3f-4g5h-6i7j-8k9l-0m1n2o3p4q5r",
  "timestamp": "2024-12-03T16:00:00Z",
  "actorUserId": "d4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9",
  "actorDisplayName": "Admin User",
  "actorIpAddress": "172.16.0.10",
  "actionType": "Deleted",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "User",
  "resourceId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "resourceName": "Deleted User",
  "organizationId": null,
  "organizationName": null,
  "details": "{\"email\":\"deleted@example.com\",\"displayName\":\"Deleted User\"}",
  "correlationId": null
}
```

---

## Authentication Events

### Successful Login

Logged when a user successfully authenticates.

- **ActionType:** `Authenticated`
- **ResourceType:** `User`
- **Trigger:** `POST /auth/login` (successful authentication)
- **Actor:** The authenticating user
- **Outcome:** `Success`

**Details Structure:**

```json
{
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
}
```

**Example Event:**

```json
{
  "id": "1d2e3f4g-5h6i-7j8k-9l0m-1n2o3p4q5r6s",
  "timestamp": "2024-12-03T08:15:00Z",
  "actorUserId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "actorDisplayName": "John Doe",
  "actorIpAddress": "203.0.113.42",
  "actionType": "Authenticated",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "User",
  "resourceId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "resourceName": "John Doe",
  "organizationId": null,
  "organizationName": null,
  "details": "{\"userAgent\":\"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\"}",
  "correlationId": "auth-abc123"
}
```

---

### Failed Login

Logged when an authentication attempt fails.

- **ActionType:** `Authenticated`
- **ResourceType:** `User`
- **Trigger:** `POST /auth/login` (failed authentication)
- **Actor:** None (authentication failed)
- **Outcome:** `Failure`

**Details Structure:**

```json
{
  "userAgent": "Mozilla/5.0..."
}
```

**Note:** The failure reason is generic ("Invalid credentials") to prevent credential enumeration attacks. The attempted email is NOT included in the event to protect privacy.

**Example Event:**

```json
{
  "id": "2e3f4g5h-6i7j-8k9l-0m1n-2o3p4q5r6s7t",
  "timestamp": "2024-12-03T08:16:30Z",
  "actorUserId": null,
  "actorDisplayName": null,
  "actorIpAddress": "198.51.100.10",
  "actionType": "Authenticated",
  "outcome": "Failure",
  "failureReason": "Invalid credentials",
  "resourceType": "User",
  "resourceId": "00000000-0000-0000-0000-000000000000",
  "resourceName": "Unknown",
  "organizationId": null,
  "organizationName": null,
  "details": "{\"userAgent\":\"curl/7.68.0\"}",
  "correlationId": "auth-def456"
}
```

---

## Authorization Events

### Authorization Denied

Logged when a user attempts an action they don't have permission to perform (403 Forbidden).

- **ActionType:** `AuthorizationDenied`
- **ResourceType:** `SystemConfiguration`
- **Trigger:** Any API endpoint that returns 403 Forbidden
- **Actor:** The user attempting the action
- **Outcome:** `Denied`
- **Automatic:** Captured by `AuditingAuthorizationMiddleware`

**Details Structure:**

```json
{
  "requestMethod": "POST",
  "requestPath": "/organizations/abc-123/proposals",
  "userRoles": ["User"],
  "statusCode": 403
}
```

**Example Event:**

```json
{
  "id": "3f4g5h6i-7j8k-9l0m-1n2o-3p4q5r6s7t8u",
  "timestamp": "2024-12-03T09:30:00Z",
  "actorUserId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "actorDisplayName": "John Doe",
  "actorIpAddress": "192.0.2.100",
  "actionType": "AuthorizationDenied",
  "outcome": "Denied",
  "failureReason": "Access denied to POST /organizations/abc-123/proposals",
  "resourceType": "SystemConfiguration",
  "resourceId": "e7d8c9b0-a1f2-3e4d-5c6b-7a8f9e0d1c2b",
  "resourceName": "/organizations/abc-123/proposals",
  "organizationId": null,
  "organizationName": null,
  "details": "{\"requestMethod\":\"POST\",\"requestPath\":\"/organizations/abc-123/proposals\",\"userRoles\":[\"User\"],\"statusCode\":403}",
  "correlationId": "req-xyz789"
}
```

---

## Organization Management Events

### Organization Created

Logged when a new organization is created.

- **ActionType:** `Created`
- **ResourceType:** `Organization`
- **Trigger:** `POST /organizations`
- **Actor:** The user creating the organization (automatically becomes OrgAdmin)

**Details Structure:**

```json
{
  "name": "Manchester United Supporters Club",
  "description": "Official supporters club",
  "websiteUrl": "https://example.com",
  "logoUrl": "https://example.com/logo.png",
  "primaryColor": "#DA291C",
  "secondaryColor": "#FBE122",
  "blockchain": "Solana"
}
```

**Example Event:**

```json
{
  "id": "4g5h6i7j-8k9l-0m1n-2o3p-4q5r6s7t8u9v",
  "timestamp": "2024-12-03T10:00:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Club Manager",
  "actorIpAddress": "198.51.100.50",
  "actionType": "Created",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "Organization",
  "resourceId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "resourceName": "Manchester United Supporters Club",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"name\":\"Manchester United Supporters Club\",\"description\":\"Official supporters club\",\"websiteUrl\":\"https://example.com\",\"blockchain\":\"Solana\"}",
  "correlationId": null
}
```

---

### Organization Updated

Logged when organization details are updated.

- **ActionType:** `Updated`
- **ResourceType:** `Organization`
- **Trigger:** `PUT /organizations/{id}`
- **Actor:** OrgAdmin or GlobalAdmin

**Details Structure:**

```json
{
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "changedFields": {
    "description": {
      "old": "Old description",
      "new": "New description"
    },
    "primaryColor": {
      "old": "#FF0000",
      "new": "#DA291C"
    }
  }
}
```

**Example Event:**

```json
{
  "id": "5h6i7j8k-9l0m-1n2o-3p4q-5r6s7t8u9v0w",
  "timestamp": "2024-12-03T11:30:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Club Manager",
  "actorIpAddress": "203.0.113.25",
  "actionType": "Updated",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "Organization",
  "resourceId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "resourceName": "Manchester United Supporters Club",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"organizationId\":\"e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0\",\"changedFields\":{\"description\":{\"old\":\"Old description\",\"new\":\"New description\"}}}",
  "correlationId": null
}
```

---

## Membership Management Events

### Membership Created

Logged when a user is added to an organization.

- **ActionType:** `Created`
- **ResourceType:** `Membership`
- **Trigger:** `POST /organizations/{orgId}/memberships`
- **Actor:** OrgAdmin or GlobalAdmin

**Details Structure:**

```json
{
  "userId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "userDisplayName": "John Doe",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "role": "Member"
}
```

**Example Event:**

```json
{
  "id": "6i7j8k9l-0m1n-2o3p-4q5r-6s7t8u9v0w1x",
  "timestamp": "2024-12-03T12:00:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Club Manager",
  "actorIpAddress": "192.168.1.50",
  "actionType": "Created",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "Membership",
  "resourceId": "f6g7h8i9-j0k1-l2m3-n4o5-p6q7r8s9t0u1",
  "resourceName": "John Doe in Manchester United Supporters Club",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"userId\":\"a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6\",\"userDisplayName\":\"John Doe\",\"organizationId\":\"e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0\",\"role\":\"Member\"}",
  "correlationId": null
}
```

---

### Membership Role Changed

Logged when a member's role is changed (e.g., Member → OrgAdmin).

- **ActionType:** `RoleChanged`
- **ResourceType:** `Membership`
- **Trigger:** `PATCH /organizations/{orgId}/memberships/{membershipId}/role`
- **Actor:** OrgAdmin or GlobalAdmin

**Details Structure:**

```json
{
  "userId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "oldRole": "Member",
  "newRole": "OrgAdmin"
}
```

**Example Event:**

```json
{
  "id": "7j8k9l0m-1n2o-3p4q-5r6s-7t8u9v0w1x2y",
  "timestamp": "2024-12-03T13:00:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Club Manager",
  "actorIpAddress": "10.0.0.100",
  "actionType": "RoleChanged",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "Membership",
  "resourceId": "f6g7h8i9-j0k1-l2m3-n4o5-p6q7r8s9t0u1",
  "resourceName": "John Doe in Manchester United Supporters Club",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"userId\":\"a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6\",\"oldRole\":\"Member\",\"newRole\":\"OrgAdmin\"}",
  "correlationId": null
}
```

---

### Membership Deleted

Logged when a member is removed from an organization.

- **ActionType:** `Deleted`
- **ResourceType:** `Membership`
- **Trigger:** `DELETE /organizations/{orgId}/memberships/{membershipId}`
- **Actor:** OrgAdmin or GlobalAdmin

**Details Structure:**

```json
{
  "userId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "userDisplayName": "John Doe",
  "role": "Member"
}
```

**Example Event:**

```json
{
  "id": "8k9l0m1n-2o3p-4q5r-6s7t-8u9v0w1x2y3z",
  "timestamp": "2024-12-03T14:00:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Club Manager",
  "actorIpAddress": "172.16.1.100",
  "actionType": "Deleted",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "Membership",
  "resourceId": "f6g7h8i9-j0k1-l2m3-n4o5-p6q7r8s9t0u1",
  "resourceName": "John Doe in Manchester United Supporters Club",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"userId\":\"a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6\",\"userDisplayName\":\"John Doe\",\"role\":\"Member\"}",
  "correlationId": null
}
```

---

## Share Management Events

### Share Type Created

Logged when a new share type is created in an organization.

- **ActionType:** `Created`
- **ResourceType:** `ShareType`
- **Trigger:** `POST /organizations/{orgId}/share-types`
- **Actor:** OrgAdmin or GlobalAdmin

**Details Structure:**

```json
{
  "name": "Gold Membership",
  "symbol": "GOLD",
  "description": "Premium membership share",
  "votingWeight": 10.0,
  "maxSupply": 1000,
  "isTransferable": false
}
```

**Example Event:**

```json
{
  "id": "9l0m1n2o-3p4q-5r6s-7t8u-9v0w1x2y3z4a",
  "timestamp": "2024-12-03T10:30:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Club Manager",
  "actorIpAddress": "198.51.100.75",
  "actionType": "Created",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "ShareType",
  "resourceId": "g7h8i9j0-k1l2-m3n4-o5p6-q7r8s9t0u1v2",
  "resourceName": "Gold Membership",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"name\":\"Gold Membership\",\"symbol\":\"GOLD\",\"description\":\"Premium membership share\",\"votingWeight\":10.0,\"maxSupply\":1000,\"isTransferable\":false}",
  "correlationId": null
}
```

---

### Share Type Updated

Logged when a share type is updated.

- **ActionType:** `Updated`
- **ResourceType:** `ShareType`
- **Trigger:** `PUT /organizations/{orgId}/share-types/{id}`
- **Actor:** OrgAdmin or GlobalAdmin

**Details Structure:**

```json
{
  "shareTypeId": "g7h8i9j0-k1l2-m3n4-o5p6-q7r8s9t0u1v2",
  "changedFields": {
    "description": {
      "old": "Old description",
      "new": "Updated description"
    },
    "maxSupply": {
      "old": 1000,
      "new": 2000
    }
  }
}
```

---

### Share Type Deleted

Logged when a share type is deleted.

- **ActionType:** `Deleted`
- **ResourceType:** `ShareType`
- **Trigger:** `DELETE /organizations/{orgId}/share-types/{id}`
- **Actor:** OrgAdmin or GlobalAdmin

**Details Structure:**

```json
{
  "name": "Gold Membership",
  "symbol": "GOLD",
  "votingWeight": 10.0
}
```

---

### Share Issuance Created

Logged when shares are issued to a user.

- **ActionType:** `Created`
- **ResourceType:** `ShareIssuance`
- **Trigger:** `POST /organizations/{orgId}/share-issuances`
- **Actor:** OrgAdmin or GlobalAdmin

**Details Structure:**

```json
{
  "recipientUserId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "recipientDisplayName": "John Doe",
  "shareTypeId": "g7h8i9j0-k1l2-m3n4-o5p6-q7r8s9t0u1v2",
  "shareTypeName": "Gold Membership",
  "quantity": 5,
  "votingWeight": 10.0,
  "totalVotingPowerAdded": 50.0,
  "reason": "Annual membership renewal"
}
```

**Example Event:**

```json
{
  "id": "0m1n2o3p-4q5r-6s7t-8u9v-0w1x2y3z4a5b",
  "timestamp": "2024-12-03T11:00:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Club Manager",
  "actorIpAddress": "192.0.2.50",
  "actionType": "Created",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "ShareIssuance",
  "resourceId": "h8i9j0k1-l2m3-n4o5-p6q7-r8s9t0u1v2w3",
  "resourceName": null,
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"recipientUserId\":\"a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6\",\"recipientDisplayName\":\"John Doe\",\"shareTypeId\":\"g7h8i9j0-k1l2-m3n4-o5p6-q7r8s9t0u1v2\",\"shareTypeName\":\"Gold Membership\",\"quantity\":5,\"votingWeight\":10.0,\"totalVotingPowerAdded\":50.0,\"reason\":\"Annual membership renewal\"}",
  "correlationId": null
}
```

---

### Share Balance Updated

Logged when a user's share balance changes (due to issuance or transfer).

- **ActionType:** `Updated`
- **ResourceType:** `ShareBalance`
- **Trigger:** Share issuance or transfer operations
- **Actor:** OrgAdmin or GlobalAdmin (for issuances)

**Details Structure:**

```json
{
  "userId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "shareTypeId": "g7h8i9j0-k1l2-m3n4-o5p6-q7r8s9t0u1v2",
  "oldBalance": 5,
  "newBalance": 10,
  "change": 5
}
```

---

## Proposal Lifecycle Events

### Proposal Created

Logged when a new proposal is created.

- **ActionType:** `Created`
- **ResourceType:** `Proposal`
- **Trigger:** `POST /organizations/{orgId}/proposals`
- **Actor:** OrgAdmin or proposal creator

**Details Structure:**

```json
{
  "title": "Select new club kit design",
  "description": "Vote for the new home kit design for 2024-25 season",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "createdByUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "startAt": "2024-12-10T00:00:00Z",
  "endAt": "2024-12-17T23:59:59Z",
  "quorumRequirement": 50.0
}
```

**Example Event:**

```json
{
  "id": "1n2o3p4q-5r6s-7t8u-9v0w-1x2y3z4a5b6c",
  "timestamp": "2024-12-03T12:30:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Club Manager",
  "actorIpAddress": "203.0.113.100",
  "actionType": "Created",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "Proposal",
  "resourceId": "i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4",
  "resourceName": "Select new club kit design",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"title\":\"Select new club kit design\",\"description\":\"Vote for the new home kit design for 2024-25 season\",\"organizationId\":\"e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0\",\"createdByUserId\":\"b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7\",\"startAt\":\"2024-12-10T00:00:00Z\",\"endAt\":\"2024-12-17T23:59:59Z\",\"quorumRequirement\":50.0}",
  "correlationId": null
}
```

---

### Proposal Updated

Logged when proposal details are updated (only in Draft status).

- **ActionType:** `Updated`
- **ResourceType:** `Proposal`
- **Trigger:** `PUT /organizations/{orgId}/proposals/{id}`
- **Actor:** OrgAdmin or proposal creator

**Details Structure:**

```json
{
  "proposalId": "i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4",
  "changedFields": {
    "title": {
      "old": "Old title",
      "new": "Updated title"
    },
    "endAt": {
      "old": "2024-12-17T23:59:59Z",
      "new": "2024-12-20T23:59:59Z"
    }
  }
}
```

---

### Proposal Status Changed: Draft → Open

Logged when a proposal is opened for voting.

- **ActionType:** `StatusChanged`
- **ResourceType:** `Proposal`
- **Trigger:** `POST /organizations/{orgId}/proposals/{id}/open`
- **Actor:** OrgAdmin

**Details Structure:**

```json
{
  "proposalId": "i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4",
  "fromStatus": "Draft",
  "toStatus": "Open",
  "eligibleVotingPowerSnapshot": 1500.0
}
```

**Note:** The `eligibleVotingPowerSnapshot` is captured when the proposal opens. This represents the total voting power eligible to vote at the moment voting begins.

**Example Event:**

```json
{
  "id": "2o3p4q5r-6s7t-8u9v-0w1x-2y3z4a5b6c7d",
  "timestamp": "2024-12-10T00:00:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Club Manager",
  "actorIpAddress": "198.51.100.200",
  "actionType": "StatusChanged",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "Proposal",
  "resourceId": "i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4",
  "resourceName": "Select new club kit design",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"proposalId\":\"i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4\",\"fromStatus\":\"Draft\",\"toStatus\":\"Open\",\"eligibleVotingPowerSnapshot\":1500.0}",
  "correlationId": null
}
```

---

### Proposal Status Changed: Open → Closed

Logged when voting closes and results are computed.

- **ActionType:** `StatusChanged`
- **ResourceType:** `Proposal`
- **Trigger:** `POST /organizations/{orgId}/proposals/{id}/close` or automatic closure at `EndAt`
- **Actor:** OrgAdmin (manual) or System (automatic)

**Details Structure:**

```json
{
  "proposalId": "i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4",
  "fromStatus": "Open",
  "toStatus": "Closed",
  "winningOptionId": "j0k1l2m3-n4o5-p6q7-r8s9-t0u1v2w3x4y5",
  "totalVotesCast": 850.0,
  "quorumMet": true,
  "closedAt": "2024-12-17T23:59:59Z"
}
```

**Example Event:**

```json
{
  "id": "3p4q5r6s-7t8u-9v0w-1x2y-3z4a5b6c7d8e",
  "timestamp": "2024-12-17T23:59:59Z",
  "actorUserId": null,
  "actorDisplayName": "System",
  "actorIpAddress": null,
  "actionType": "StatusChanged",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "Proposal",
  "resourceId": "i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4",
  "resourceName": "Select new club kit design",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"proposalId\":\"i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4\",\"fromStatus\":\"Open\",\"toStatus\":\"Closed\",\"winningOptionId\":\"j0k1l2m3-n4o5-p6q7-r8s9-t0u1v2w3x4y5\",\"totalVotesCast\":850.0,\"quorumMet\":true,\"closedAt\":\"2024-12-17T23:59:59Z\"}",
  "correlationId": null
}
```

---

### Proposal Status Changed: Closed → Finalized

Logged when a proposal is finalized (permanent lock).

- **ActionType:** `StatusChanged`
- **ResourceType:** `Proposal`
- **Trigger:** `POST /organizations/{orgId}/proposals/{id}/finalize`
- **Actor:** OrgAdmin

**Details Structure:**

```json
{
  "proposalId": "i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4",
  "fromStatus": "Closed",
  "toStatus": "Finalized",
  "finalizedAt": "2024-12-18T10:00:00Z"
}
```

---

### Proposal Option Created

Logged when a new voting option is added to a proposal.

- **ActionType:** `Created`
- **ResourceType:** `ProposalOption`
- **Trigger:** `POST /organizations/{orgId}/proposals/{proposalId}/options`
- **Actor:** OrgAdmin or proposal creator

**Details Structure:**

```json
{
  "proposalId": "i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4",
  "text": "Red home kit with white trim",
  "description": "Traditional red with modern white accents"
}
```

---

## Voting Events

### Vote Created

Logged when a user casts a vote on a proposal.

- **ActionType:** `Created`
- **ResourceType:** `Vote`
- **Trigger:** `POST /organizations/{orgId}/proposals/{proposalId}/votes`
- **Actor:** The voting user

**Details Structure:**

```json
{
  "proposalId": "i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4",
  "proposalTitle": "Select new club kit design",
  "selectedOptionId": "j0k1l2m3-n4o5-p6q7-r8s9-t0u1v2w3x4y5",
  "selectedOptionText": "Red home kit with white trim",
  "votingPower": 50.0,
  "userId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6"
}
```

**Example Event:**

```json
{
  "id": "4q5r6s7t-8u9v-0w1x-2y3z-4a5b6c7d8e9f",
  "timestamp": "2024-12-15T14:30:00Z",
  "actorUserId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "actorDisplayName": "John Doe",
  "actorIpAddress": "192.0.2.150",
  "actionType": "Created",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "Vote",
  "resourceId": "k1l2m3n4-o5p6-q7r8-s9t0-u1v2w3x4y5z6",
  "resourceName": "Vote on Select new club kit design",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"proposalId\":\"i9j0k1l2-m3n4-o5p6-q7r8-s9t0u1v2w3x4\",\"proposalTitle\":\"Select new club kit design\",\"selectedOptionId\":\"j0k1l2m3-n4o5-p6q7-r8s9-t0u1v2w3x4y5\",\"selectedOptionText\":\"Red home kit with white trim\",\"votingPower\":50.0,\"userId\":\"a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6\"}",
  "correlationId": "vote-req-abc123"
}
```

---

## Webhook Management Events

### Webhook Endpoint Created

Logged when a webhook endpoint is registered.

- **ActionType:** `Created`
- **ResourceType:** `WebhookEndpoint`
- **Trigger:** `POST /organizations/{orgId}/webhook-endpoints`
- **Actor:** OrgAdmin

**Details Structure:**

```json
{
  "endpointUrl": "https://****:****@example.com/webhook",
  "subscribedEvents": ["ProposalCreated", "ProposalFinalized", "VoteCast"],
  "isActive": true
}
```

**Note:** The webhook URL is masked to hide credentials if embedded in the URL.

**Example Event:**

```json
{
  "id": "5r6s7t8u-9v0w-1x2y-3z4a-5b6c7d8e9f0g",
  "timestamp": "2024-12-03T15:00:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Club Manager",
  "actorIpAddress": "198.51.100.250",
  "actionType": "Created",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "WebhookEndpoint",
  "resourceId": "l2m3n4o5-p6q7-r8s9-t0u1-v2w3x4y5z6a7",
  "resourceName": "https://****:****@example.com/webhook",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"endpointUrl\":\"https://****:****@example.com/webhook\",\"subscribedEvents\":[\"ProposalCreated\",\"ProposalFinalized\",\"VoteCast\"],\"isActive\":true}",
  "correlationId": null
}
```

---

### Webhook Endpoint Updated

Logged when webhook endpoint configuration is updated.

- **ActionType:** `Updated`
- **ResourceType:** `WebhookEndpoint`
- **Trigger:** `PUT /organizations/{orgId}/webhook-endpoints/{id}`
- **Actor:** OrgAdmin

**Details Structure:**

```json
{
  "changedFields": {
    "subscribedEvents": {
      "old": ["ProposalCreated", "ProposalFinalized"],
      "new": ["ProposalCreated", "ProposalFinalized", "VoteCast"]
    },
    "isActive": {
      "old": false,
      "new": true
    }
  }
}
```

---

### Webhook Endpoint Deleted

Logged when a webhook endpoint is removed.

- **ActionType:** `Deleted`
- **ResourceType:** `WebhookEndpoint`
- **Trigger:** `DELETE /organizations/{orgId}/webhook-endpoints/{id}`
- **Actor:** OrgAdmin

**Details Structure:**

```json
{
  "endpointUrl": "https://****:****@example.com/webhook",
  "subscribedEvents": ["ProposalCreated", "ProposalFinalized", "VoteCast"]
}
```

---

### Outbound Event Status Changed

Logged when a webhook delivery status changes (Pending → Delivered/Failed).

- **ActionType:** `StatusChanged`
- **ResourceType:** `OutboundEvent`
- **Trigger:** Webhook delivery background service
- **Actor:** System (automated)

**Details Structure:**

```json
{
  "eventType": "ProposalFinalized",
  "fromStatus": "Pending",
  "toStatus": "Delivered",
  "attemptCount": 1,
  "webhookEndpointId": "l2m3n4o5-p6q7-r8s9-t0u1-v2w3x4y5z6a7"
}
```

**For failures:**

```json
{
  "eventType": "ProposalFinalized",
  "fromStatus": "Pending",
  "toStatus": "Failed",
  "attemptCount": 3,
  "webhookEndpointId": "l2m3n4o5-p6q7-r8s9-t0u1-v2w3x4y5z6a7",
  "lastError": "HTTP 500 Internal Server Error from https://example.com/webhook"
}
```

---

## Admin Actions

### Admin Data Seeded

Logged when the admin seeds demo/test data.

- **ActionType:** `AdminDataSeeded`
- **ResourceType:** `SystemConfiguration`
- **Trigger:** `POST /admin/seed-data`
- **Actor:** GlobalAdmin

**Details Structure:**

```json
{
  "usersCreated": 5,
  "organizationsCreated": 2,
  "shareTypesCreated": 4,
  "proposalsCreated": 3
}
```

**Example Event:**

```json
{
  "id": "6s7t8u9v-0w1x-2y3z-4a5b-6c7d8e9f0g1h",
  "timestamp": "2024-12-03T09:00:00Z",
  "actorUserId": "c3d4e5f6-g7h8-i9j0-k1l2-m3n4o5p6q7r8",
  "actorDisplayName": "Platform Admin",
  "actorIpAddress": "10.0.0.1",
  "actionType": "AdminDataSeeded",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "SystemConfiguration",
  "resourceId": "a1b2c3d4-0000-0000-0000-000000000001",
  "resourceName": "Seed Data",
  "organizationId": null,
  "organizationName": null,
  "details": "{\"usersCreated\":5,\"organizationsCreated\":2,\"shareTypesCreated\":4,\"proposalsCreated\":3}",
  "correlationId": null
}
```

---

### Admin Data Reset

Logged when the admin resets data (destructive operation).

- **ActionType:** `AdminDataReset`
- **ResourceType:** `SystemConfiguration`
- **Trigger:** `POST /admin/reset-data`
- **Actor:** GlobalAdmin

**Details Structure:**

```json
{
  "tablesCleared": ["Users", "Organizations", "Proposals", "Votes"],
  "recordsDeleted": 1250
}
```

---

### Admin Data Cleanup

Logged when the admin performs data cleanup operations.

- **ActionType:** `AdminDataCleanup`
- **ResourceType:** `SystemConfiguration`
- **Trigger:** `POST /admin/cleanup-data`
- **Actor:** GlobalAdmin

**Details Structure:**

```json
{
  "action": "Purge old audit events",
  "recordsDeleted": 5000,
  "cutoffDate": "2023-12-03T00:00:00Z"
}
```

---

### Audit Events Accessed

Logged when audit events are queried via admin APIs.

- **ActionType:** `Accessed`
- **ResourceType:** `AuditEvent`
- **Trigger:** `GET /admin/audit-events` or `GET /organizations/{orgId}/audit-events`
- **Actor:** GlobalAdmin or OrgAdmin

**Details Structure:**

```json
{
  "endpoint": "/admin/audit-events",
  "filters": {
    "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
    "actionTypes": ["Created", "Updated"],
    "dateFrom": "2024-11-01T00:00:00Z",
    "dateTo": "2024-12-01T00:00:00Z"
  },
  "resultCount": 42
}
```

---

### Audit Events Exported

Logged when audit events are exported to CSV or JSON.

- **ActionType:** `Exported`
- **ResourceType:** `AuditEvent`
- **Trigger:** `GET /admin/audit-events/export` or `GET /organizations/{orgId}/audit-events/export`
- **Actor:** GlobalAdmin or OrgAdmin

**Details Structure:**

```json
{
  "endpoint": "/admin/audit-events/export",
  "format": "csv",
  "filters": {
    "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
    "dateFrom": "2024-11-01T00:00:00Z",
    "dateTo": "2024-12-01T00:00:00Z"
  },
  "recordCount": 150
}
```

**Example Event:**

```json
{
  "id": "7t8u9v0w-1x2y-3z4a-5b6c-7d8e9f0g1h2i",
  "timestamp": "2024-12-03T16:30:00Z",
  "actorUserId": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
  "actorDisplayName": "Club Manager",
  "actorIpAddress": "203.0.113.200",
  "actionType": "Exported",
  "outcome": "Success",
  "failureReason": null,
  "resourceType": "AuditEvent",
  "resourceId": "00000000-0000-0000-0000-000000000000",
  "resourceName": "Audit Export",
  "organizationId": "e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0",
  "organizationName": "Manchester United Supporters Club",
  "details": "{\"endpoint\":\"/organizations/e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0/audit-events/export\",\"format\":\"csv\",\"filters\":{\"dateFrom\":\"2024-11-01T00:00:00Z\",\"dateTo\":\"2024-12-01T00:00:00Z\"},\"recordCount\":150}",
  "correlationId": "export-xyz789"
}
```

---

## Event Details Schema Reference

This section provides JSON schema definitions for common detail structures.

### Changed Fields Pattern

Used by Update events to show what changed:

```typescript
interface ChangedFields {
  [fieldName: string]: {
    old: any;
    new: any;
  }
}

// Example
{
  "changedFields": {
    "displayName": {
      "old": "Old Name",
      "new": "New Name"
    }
  }
}
```

### User Context

Used by events involving users:

```typescript
interface UserContext {
  userId: string;          // UUID
  userDisplayName: string;
  userEmail?: string;
}
```

### Organization Context

Used by events within an organization:

```typescript
interface OrganizationContext {
  organizationId: string;  // UUID
  organizationName: string;
}
```

### Voting Context

Used by voting-related events:

```typescript
interface VotingContext {
  proposalId: string;
  proposalTitle: string;
  selectedOptionId?: string;
  selectedOptionText?: string;
  votingPower: number;
}
```

### Status Change Pattern

Used by StatusChanged events:

```typescript
interface StatusChange {
  fromStatus: string;
  toStatus: string;
  [additionalFields: string]: any;
}
```

---

## Query Examples

### Find all failed login attempts for a user

```http
GET /admin/audit-events?actionType=Authenticated&outcome=Failure&dateFrom=2024-12-01T00:00:00Z
```

### Find all authorization denials in an organization

```http
GET /organizations/{orgId}/audit-events?actionType=AuthorizationDenied&dateFrom=2024-12-01T00:00:00Z
```

### Track a specific resource's history

```http
GET /admin/audit-events?resourceType=Proposal&resourceId={proposalId}
```

### Find all admin actions

```http
GET /admin/audit-events?actionType=AdminDataSeeded,AdminDataReset,AdminDataCleanup
```

### Export organization audit trail

```http
GET /organizations/{orgId}/audit-events/export?format=csv&dateFrom=2024-01-01T00:00:00Z&dateTo=2024-12-31T23:59:59Z
```

---

## Related Documentation

- **[Architecture Overview](./architecture.md)** - System design and component architecture
- **[Data Model](./data-model.md)** - Entity schema and indexing strategy
- **[Event Categorization](./event-categorization.md)** - Enum definitions and categorization rules
- **[Development Guide](./development.md)** - How to add new audit events
- **[Operations Guide](./operations.md)** - Querying and troubleshooting in production
