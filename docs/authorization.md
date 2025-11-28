# Authorization Infrastructure

This document describes the authorization infrastructure implemented in the FanEngagement platform. It covers the policy-based authorization system, custom authorization handlers, and how to apply authorization to new endpoints.

## Table of Contents

- [Overview](#overview)
- [Authorization Policies](#authorization-policies)
- [Authorization Handlers](#authorization-handlers)
  - [OrganizationMemberHandler](#organizationmemberhandler)
  - [OrganizationAdminHandler](#organizationadminhandler)
  - [ProposalManagerHandler](#proposalmanagerhandler)
  - [ProposalMemberHandler](#proposalmemberhandler)
- [Route Value Helpers](#route-value-helpers)
- [Policy Registration](#policy-registration)
- [GlobalAdmin Bypass Behavior](#globaladmin-bypass-behavior)
- [Usage Examples](#usage-examples)
- [Adding Authorization to New Endpoints](#adding-authorization-to-new-endpoints)

---

## Overview

FanEngagement uses ASP.NET Core's policy-based authorization system to implement fine-grained access control. The authorization infrastructure is located in `backend/FanEngagement.Api/Authorization/` and consists of:

1. **Requirement Classes**: Define what is required for authorization (e.g., `OrganizationMemberRequirement`)
2. **Handler Classes**: Implement the logic to evaluate requirements (e.g., `OrganizationMemberHandler`)
3. **Policies**: Named combinations of requirements registered in `Program.cs`

The system extracts context from JWT claims (user ID, global role) and route values (organization ID, proposal ID) to make authorization decisions.

---

## Authorization Policies

Four authorization policies are registered in the application:

| Policy | Requirement Class | Description |
|--------|-------------------|-------------|
| `GlobalAdmin` | Built-in role requirement | Requires `UserRole.Admin` (platform administrator) |
| `OrgMember` | `OrganizationMemberRequirement` | Requires membership in the target organization |
| `OrgAdmin` | `OrganizationAdminRequirement` | Requires `OrgAdmin` role in the target organization |
| `ProposalManager` | `ProposalManagerRequirement` | Requires proposal creator, OrgAdmin, or GlobalAdmin status |

All organization-level policies automatically allow access for GlobalAdmin users.

---

## Authorization Handlers

### OrganizationMemberHandler

**File**: `backend/FanEngagement.Api/Authorization/OrganizationMemberHandler.cs`

**Purpose**: Validates that the authenticated user is a member of the organization specified in the route.

**Requirements Class**: `OrganizationMemberRequirement` (marker class implementing `IAuthorizationRequirement`)

**How It Works**:

1. **GlobalAdmin Check**: If the user has the `Admin` role claim, authorization succeeds immediately
2. **User ID Extraction**: Extracts user ID from `ClaimTypes.NameIdentifier` JWT claim
3. **Organization ID Extraction**: Uses `RouteValueHelpers.TryGetOrganizationId()` to extract organization ID from route values
4. **Membership Query**: Queries `OrganizationMemberships` table to verify the user has any membership in the organization

**Database Query**:

```csharp
var isMember = await _dbContext.OrganizationMemberships
    .AnyAsync(m => m.UserId == userId && m.OrganizationId == organizationId);
```

**Failure Scenarios** (authorization silently fails):

- No valid user ID in JWT claims
- No organization ID in route values
- User is not a member of the organization

---

### OrganizationAdminHandler

**File**: `backend/FanEngagement.Api/Authorization/OrganizationAdminHandler.cs`

**Purpose**: Validates that the authenticated user is an OrgAdmin of the organization specified in the route.

**Requirements Class**: `OrganizationAdminRequirement` (marker class implementing `IAuthorizationRequirement`)

**How It Works**:

1. **GlobalAdmin Check**: If the user has the `Admin` role claim, authorization succeeds immediately
2. **User ID Extraction**: Extracts user ID from `ClaimTypes.NameIdentifier` JWT claim
3. **Organization ID Extraction**: Uses `RouteValueHelpers.TryGetOrganizationId()` to extract organization ID from route values
4. **OrgAdmin Query**: Queries `OrganizationMemberships` table to verify the user has `OrgAdmin` role in the organization

**Database Query**:

```csharp
var isOrgAdmin = await _dbContext.OrganizationMemberships
    .AnyAsync(m => m.UserId == userId 
              && m.OrganizationId == organizationId 
              && m.Role == OrganizationRole.OrgAdmin);
```

**Failure Scenarios** (authorization silently fails):

- No valid user ID in JWT claims
- No organization ID in route values
- User is not an OrgAdmin of the organization (even if they are a regular member)

---

### ProposalManagerHandler

**File**: `backend/FanEngagement.Api/Authorization/ProposalManagerHandler.cs`

**Purpose**: Validates that the authenticated user can manage a proposal (update, open, close, finalize, add/delete options).

**Requirements Class**: `ProposalManagerRequirement` (marker class implementing `IAuthorizationRequirement`)

**Allowed Users**:

- GlobalAdmin users
- The proposal creator (user who created the proposal)
- OrgAdmin of the organization that owns the proposal

**How It Works**:

1. **GlobalAdmin Check**: If the user has the `Admin` role claim, authorization succeeds immediately
2. **User ID Extraction**: Extracts user ID from `ClaimTypes.NameIdentifier` JWT claim
3. **Proposal ID Extraction**: Extracts `proposalId` directly from route values
4. **Proposal Lookup**: Retrieves the proposal's `CreatedByUserId` and `OrganizationId`
5. **Creator Check**: If the user is the proposal creator, authorization succeeds
6. **OrgAdmin Check**: Queries `OrganizationMemberships` to check if user is OrgAdmin of the proposal's organization

**Database Queries**:

```csharp
// Get proposal info
var proposal = await _dbContext.Proposals
    .Where(p => p.Id == proposalId)
    .Select(p => new { p.CreatedByUserId, p.OrganizationId })
    .FirstOrDefaultAsync();

// Check OrgAdmin status (if not creator)
var isOrgAdmin = await _dbContext.OrganizationMemberships
    .AnyAsync(m => m.UserId == userId 
              && m.OrganizationId == proposal.OrganizationId 
              && m.Role == OrganizationRole.OrgAdmin);
```

**Failure Scenarios** (authorization silently fails):

- No valid user ID in JWT claims
- No proposal ID in route values
- Invalid proposal ID format
- Proposal not found
- User is neither the creator nor an OrgAdmin of the organization

---

### ProposalMemberHandler

**File**: `backend/FanEngagement.Api/Authorization/ProposalMemberHandler.cs`

**Purpose**: Handles `OrganizationMemberRequirement` for routes that contain `proposalId` instead of `organizationId`. This allows the same `OrgMember` policy to work on proposal-centric routes.

**Requirements Class**: `OrganizationMemberRequirement` (same as `OrganizationMemberHandler`)

**Why It Exists**: Some endpoints use `proposalId` in the route (e.g., `/proposals/{proposalId}/votes`) rather than `organizationId`. This handler looks up the proposal to determine the organization and then checks membership.

**How It Works**:

1. **GlobalAdmin Check**: If the user has the `Admin` role claim, authorization succeeds immediately
2. **User ID Extraction**: Extracts user ID from `ClaimTypes.NameIdentifier` JWT claim
3. **Proposal ID Extraction**: Checks if `proposalId` exists in route values
4. **Organization Lookup**: Queries the proposal to get its `OrganizationId`
5. **Membership Query**: Verifies the user is a member of the proposal's organization

**Database Queries**:

```csharp
// Get organization from proposal
var organizationId = await _dbContext.Proposals
    .Where(p => p.Id == proposalId)
    .Select(p => p.OrganizationId)
    .FirstOrDefaultAsync();

// Check membership
var isMember = await _dbContext.OrganizationMemberships
    .AnyAsync(m => m.UserId == userId && m.OrganizationId == organizationId);
```

**Handler Coordination**: When the `OrgMember` policy is evaluated, both `OrganizationMemberHandler` and `ProposalMemberHandler` are invoked. If either handler succeeds, the requirement is satisfied. This allows the same policy to work on both organization-centric and proposal-centric routes.

---

## Route Value Helpers

**File**: `backend/FanEngagement.Api/Authorization/RouteValueHelpers.cs`

**Purpose**: Provides helper methods for extracting values from route data in a consistent manner across handlers.

### TryGetOrganizationId

```csharp
public static bool TryGetOrganizationId(RouteValueDictionary routeValues, out Guid organizationId)
```

**Purpose**: Extracts an organization ID from route values, supporting multiple route parameter naming conventions.

**Parameter Lookup Order**:

1. `organizationId` - Standard parameter name (e.g., `/organizations/{organizationId}/proposals`)
2. `id` - Fallback for `/organizations/{id}` style routes

**Returns**: `true` if a valid GUID was extracted; `false` otherwise

**Usage Example**:

```csharp
if (RouteValueHelpers.TryGetOrganizationId(httpContext.Request.RouteValues, out var organizationId))
{
    // organizationId is valid, proceed with authorization check
}
```

**Why Both Parameters**: Different routes may use different parameter names:

- `GET /organizations/{id}` uses `id`
- `GET /organizations/{organizationId}/proposals` uses `organizationId`

The helper abstracts this difference from authorization handlers.

---

## Policy Registration

Policies are registered in `backend/FanEngagement.Api/Program.cs`:

```csharp
// Register authorization handlers
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAuthorizationHandler, OrganizationMemberHandler>();
builder.Services.AddScoped<IAuthorizationHandler, OrganizationAdminHandler>();
builder.Services.AddScoped<IAuthorizationHandler, ProposalManagerHandler>();
builder.Services.AddScoped<IAuthorizationHandler, ProposalMemberHandler>();

// Configure authorization policies
builder.Services.AddAuthorization(options =>
{
    // Policy: User must be a Global Admin
    options.AddPolicy("GlobalAdmin", policy =>
        policy.RequireRole("Admin"));

    // Policy: User must be a member of the organization in the route (or Global Admin)
    options.AddPolicy("OrgMember", policy =>
        policy.Requirements.Add(new OrganizationMemberRequirement()));

    // Policy: User must be an OrgAdmin of the organization in the route (or Global Admin)
    options.AddPolicy("OrgAdmin", policy =>
        policy.Requirements.Add(new OrganizationAdminRequirement()));

    // Policy: User must be the proposal creator, OrgAdmin of the org, or Global Admin
    options.AddPolicy("ProposalManager", policy =>
        policy.Requirements.Add(new ProposalManagerRequirement()));
});
```

### Key Points

1. **Handler Registration**: All handlers are registered as scoped services (`AddScoped`) to ensure proper lifetime management with database contexts

2. **HttpContextAccessor**: Required for handlers to access route values from the current request

3. **Multiple Handlers Per Requirement**: `OrganizationMemberRequirement` has two handlers (`OrganizationMemberHandler` and `ProposalMemberHandler`). ASP.NET Core evaluates all handlers; if any handler succeeds, the requirement is satisfied

4. **Policy Names**: Policies use descriptive names (`OrgMember`, `OrgAdmin`, `ProposalManager`) that are referenced in `[Authorize]` attributes

---

## GlobalAdmin Bypass Behavior

**All custom authorization handlers implement GlobalAdmin bypass as their first check.**

```csharp
// Check if user is Global Admin - they bypass all org checks
if (context.User.IsInRole("Admin"))
{
    context.Succeed(requirement);
    return;
}
```

### Behavior

- Users with `UserRole.Admin` (GlobalAdmin) automatically pass **all** organization-level authorization checks
- This applies to `OrgMember`, `OrgAdmin`, and `ProposalManager` policies
- GlobalAdmins do not need organization membership to access or manage resources
- This enables platform administrators to manage all organizations without explicit membership

### Security Implications

> **Security Note**: GlobalAdmin is a powerful role that bypasses all organization-level access controls. It should be granted only to trusted platform operators.

### How GlobalAdmin Role is Determined

- The user's global role (`UserRole.Admin`) is included in the JWT token as a role claim
- `context.User.IsInRole("Admin")` checks for this claim during authorization
- The role is set on the `User` entity and included in the token at login time

---

## Usage Examples

### Protecting a Controller Action

```csharp
[ApiController]
[Route("organizations/{organizationId}/share-types")]
public class ShareTypesController : ControllerBase
{
    // Only OrgAdmins (or GlobalAdmins) can create share types
    [HttpPost]
    [Authorize(Policy = "OrgAdmin")]
    public async Task<ActionResult<ShareType>> Create(
        Guid organizationId, 
        CreateShareTypeRequest request)
    {
        // Implementation
    }

    // Any organization member can list share types
    [HttpGet]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult<List<ShareType>>> GetAll(Guid organizationId)
    {
        // Implementation
    }
}
```

### Protecting Proposal Management Actions

```csharp
[ApiController]
[Route("proposals/{proposalId}")]
public class ProposalsController : ControllerBase
{
    // Only proposal creator, OrgAdmin, or GlobalAdmin can update
    [HttpPut]
    [Authorize(Policy = "ProposalManager")]
    public async Task<ActionResult<Proposal>> Update(
        Guid proposalId, 
        UpdateProposalRequest request)
    {
        // Implementation
    }

    // Any member of the proposal's organization can view results
    [HttpGet("results")]
    [Authorize(Policy = "OrgMember")]
    public async Task<ActionResult<ProposalResults>> GetResults(Guid proposalId)
    {
        // Implementation - ProposalMemberHandler handles this
    }
}
```

### GlobalAdmin-Only Endpoints

```csharp
[ApiController]
[Route("users")]
public class UsersController : ControllerBase
{
    // Only GlobalAdmins can list all users
    [HttpGet]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult<PagedResult<User>>> GetAll(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 10)
    {
        // Implementation
    }
}
```

### Controller-Level vs Action-Level Authorization

```csharp
// Controller-level: applies to all actions
[ApiController]
[Route("organizations/{organizationId}/webhooks")]
[Authorize(Policy = "OrgAdmin")]
public class WebhookEndpointsController : ControllerBase
{
    // All actions require OrgAdmin
    [HttpPost]
    public async Task<ActionResult<WebhookEndpoint>> Create(...) { }

    [HttpGet]
    public async Task<ActionResult<List<WebhookEndpoint>>> GetAll(...) { }
}
```

---

## Adding Authorization to New Endpoints

### Step 1: Identify the Required Access Level

Determine who should be able to access the endpoint:

| Access Level | Policy to Use |
|--------------|---------------|
| Platform administrators only | `GlobalAdmin` |
| Any member of the organization | `OrgMember` |
| Organization administrators only | `OrgAdmin` |
| Proposal creator or OrgAdmin | `ProposalManager` |
| Any authenticated user | `[Authorize]` (no policy) |
| Public (no auth required) | `[AllowAnonymous]` |

### Step 2: Ensure Route Contains Required Parameters

- For `OrgMember` and `OrgAdmin` policies: Route must contain `organizationId` or `id` parameter
- For `ProposalManager` policy: Route must contain `proposalId` parameter
- For proposal-based member checks: The `ProposalMemberHandler` will look up the organization from the proposal

### Step 3: Apply the Authorize Attribute

```csharp
// Action-level authorization
[HttpPost]
[Authorize(Policy = "OrgAdmin")]
public async Task<ActionResult> MyAction(Guid organizationId, ...)
{
    // Implementation
}

// Or controller-level for all actions
[ApiController]
[Route("organizations/{organizationId}/my-resource")]
[Authorize(Policy = "OrgMember")]
public class MyResourceController : ControllerBase
{
    // All actions require OrgMember
}
```

### Step 4: Test Authorization

Write integration tests to verify:

1. Authorized users can access the endpoint
2. Unauthorized users receive 403 Forbidden
3. Unauthenticated users receive 401 Unauthorized
4. GlobalAdmins can access organization-scoped endpoints

Example test pattern:

```csharp
[Fact]
public async Task MyAction_AsOrgMember_ReturnsSuccess()
{
    var (_, memberToken) = await CreateMemberAsync(orgId);
    _client.AddAuthorizationHeader(memberToken);
    
    var response = await _client.PostAsync($"/organizations/{orgId}/my-resource", content);
    
    Assert.Equal(HttpStatusCode.Created, response.StatusCode);
}

[Fact]
public async Task MyAction_AsNonMember_ReturnsForbidden()
{
    var (_, nonMemberToken) = await CreateUserAsync();
    _client.AddAuthorizationHeader(nonMemberToken);
    
    var response = await _client.PostAsync($"/organizations/{orgId}/my-resource", content);
    
    Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
}
```

---

## Related Documentation

- [Architecture Overview](./architecture.md) - Full architecture documentation including Roles & Permissions section
- [Proposal Governance Rules](./architecture.md#proposal-governance-rules) - Detailed governance model
- [Testing Strategy](./architecture.md#testing-strategy) - How authorization is tested
