---
name: "Coding Task"
about: "Define and register authorization policies"
title: "[Dev] E-006-03: Define and Register Authorization Policies"
labels: ["development", "copilot", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Define and register all authorization policies in the ASP.NET Core authorization system. These policies will be referenced by controllers to enforce role-based access control.

This story is part of **Epic E-006: Security and Authorization Hardening**.

**Depends on:** E-006-01 (Authorization Service and Handlers)

---

## 2. Requirements

- Register `OrgMember` policy requiring organization membership
- Register `OrgAdmin` policy requiring OrgAdmin role in the organization
- Register `ProposalManager` policy allowing proposal creator OR OrgAdmin
- Register `ResourceOwner` policy for self-access checks (user's own resources)
- Register `GlobalAdmin` policy requiring `UserRole.Admin` (may already exist)
- All policies must be registered in `Program.cs` or a dedicated extension method
- Policies must use the handlers created in E-006-01

---

## 3. Acceptance Criteria (Testable)

- [ ] `OrgMember` policy registered and uses `OrgMemberRequirement`
- [ ] `OrgAdmin` policy registered and uses `OrgAdminRequirement`
- [ ] `ProposalManager` policy registered with composite requirements
- [ ] `ResourceOwner` policy registered and uses `ResourceOwnerRequirement`
- [ ] `GlobalAdmin` policy exists (create if not present)
- [ ] Policies registered in `Program.cs` via `AddAuthorization` configuration
- [ ] Authorization handlers registered in DI container
- [ ] Unit tests verify policy requirements are configured correctly
- [ ] Integration tests verify policies can be evaluated
- [ ] All existing tests pass (`dotnet test`)

---

## 4. Constraints

- Do not apply policies to controllers yet (other stories will do this)
- Do not refactor unrelated code
- Maintain backward compatibility with existing `[Authorize]` attributes
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Policy Registration Pattern:**

```csharp
// In Program.cs or an extension method
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("GlobalAdmin", policy =>
        policy.RequireRole("Admin"));
    
    options.AddPolicy("OrgMember", policy =>
        policy.Requirements.Add(new OrgMemberRequirement()));
    
    options.AddPolicy("OrgAdmin", policy =>
        policy.Requirements.Add(new OrgAdminRequirement()));
    
    options.AddPolicy("ProposalManager", policy =>
        policy.Requirements.Add(new ProposalManagerRequirement()));
    
    options.AddPolicy("ResourceOwner", policy =>
        policy.Requirements.Add(new ResourceOwnerRequirement()));
});

// Register handlers
builder.Services.AddScoped<IAuthorizationHandler, OrgMemberHandler>();
builder.Services.AddScoped<IAuthorizationHandler, OrgAdminHandler>();
builder.Services.AddScoped<IAuthorizationHandler, ProposalManagerHandler>();
builder.Services.AddScoped<IAuthorizationHandler, ResourceOwnerHandler>();
```

**Policy Names (for reference in controllers):**
- `"GlobalAdmin"` - Platform-wide admin
- `"OrgMember"` - Member of the organization in route context
- `"OrgAdmin"` - OrgAdmin of the organization in route context
- `"ProposalManager"` - Creator of proposal OR OrgAdmin
- `"ResourceOwner"` - Owner of the requested resource

**Key Files to Reference:**
- `backend/FanEngagement.Api/Program.cs`
- `docs/architecture.md` → Authorization Model section

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Api/Program.cs`
- `backend/FanEngagement.Api/Extensions/**` (if creating extension methods)
- `backend/FanEngagement.Infrastructure/DependencyInjection.cs` (if adding there)
- `backend/FanEngagement.Tests/**` (new tests)

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test the work (`dotnet build`, `dotnet test`)
- List of all registered policies and their requirements
- Confirmed adherence to architecture and authorization rules
