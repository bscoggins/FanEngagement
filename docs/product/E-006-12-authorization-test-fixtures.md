---
name: "Coding Task"
about: "Create authorization test fixtures for all role combinations"
title: "[Dev] E-006-12: Create Authorization Test Fixtures"
labels: ["development", "copilot", "testing", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Create comprehensive test fixtures and helper methods for authorization testing. These fixtures will enable efficient creation of authenticated HTTP clients with different role combinations (GlobalAdmin, OrgAdmin, OrgMember, non-member) for integration tests.

This story is part of **Epic E-006: Security and Authorization Hardening**.

**Priority:** NOW - Foundation for all authorization tests.

---

## 2. Requirements

- Create helper method to create GlobalAdmin authenticated HTTP client
- Create helper method to create OrgAdmin authenticated HTTP client for a specific organization
- Create helper method to create OrgMember authenticated HTTP client for a specific organization
- Create helper method to create non-member authenticated HTTP client
- Create helper method to create unauthenticated HTTP client
- Helpers should set up required test data (users, memberships, shares if needed)
- Helpers should return both the HTTP client and relevant context (user ID, org ID, etc.)
- Follow existing test patterns in the repository

---

## 3. Acceptance Criteria (Testable)

- [ ] `CreateGlobalAdminClientAsync()` returns authenticated client with Admin role
- [ ] `CreateOrgAdminClientAsync(orgId)` returns authenticated client with OrgAdmin membership
- [ ] `CreateOrgMemberClientAsync(orgId)` returns authenticated client with Member membership
- [ ] `CreateNonMemberClientAsync()` returns authenticated client without any org membership
- [ ] `CreateUnauthenticatedClient()` returns client without auth header
- [ ] Each helper creates necessary test data (user, membership)
- [ ] Each helper returns context object with user ID and other relevant info
- [ ] Helpers use existing `TestAuthenticationHelper` patterns
- [ ] Sample tests demonstrate usage of each fixture
- [ ] All existing tests pass (`dotnet test`)

---

## 4. Constraints

- Build on existing test infrastructure (`WebApplicationFactory`, `TestAuthenticationHelper`)
- Do not modify existing passing tests
- Follow existing test naming and organization patterns
- Test data should be isolated per test run
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Existing Test Infrastructure:**
- `TestWebApplicationFactory` - creates test server with in-memory database
- `TestAuthenticationHelper` - creates authenticated users and tokens
- `HttpClientExtensions.AddAuthorizationHeader()` - adds JWT to requests

**Proposed Fixture Pattern:**

```csharp
public static class AuthorizationTestFixtures
{
    public class AuthorizedClient
    {
        public HttpClient Client { get; set; }
        public Guid UserId { get; set; }
        public string UserEmail { get; set; }
        public Guid? OrganizationId { get; set; }
        public OrganizationRole? Role { get; set; }
    }
    
    public static async Task<AuthorizedClient> CreateGlobalAdminClientAsync(
        TestWebApplicationFactory factory)
    {
        var (user, token) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(factory);
        var client = factory.CreateClient();
        client.AddAuthorizationHeader(token);
        
        return new AuthorizedClient
        {
            Client = client,
            UserId = user.Id,
            UserEmail = user.Email
        };
    }
    
    public static async Task<AuthorizedClient> CreateOrgAdminClientAsync(
        TestWebApplicationFactory factory,
        Guid organizationId)
    {
        // Create user
        var (user, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(factory);
        
        // Create OrgAdmin membership
        await CreateMembershipAsync(factory, user.Id, organizationId, OrganizationRole.OrgAdmin);
        
        var client = factory.CreateClient();
        client.AddAuthorizationHeader(token);
        
        return new AuthorizedClient
        {
            Client = client,
            UserId = user.Id,
            UserEmail = user.Email,
            OrganizationId = organizationId,
            Role = OrganizationRole.OrgAdmin
        };
    }
    
    public static async Task<AuthorizedClient> CreateOrgMemberClientAsync(
        TestWebApplicationFactory factory,
        Guid organizationId,
        bool withVotingPower = false)
    {
        // Create user
        var (user, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(factory);
        
        // Create Member membership
        await CreateMembershipAsync(factory, user.Id, organizationId, OrganizationRole.Member);
        
        // Optionally add shares for voting power
        if (withVotingPower)
        {
            await IssueSharesAsync(factory, user.Id, organizationId, quantity: 100);
        }
        
        var client = factory.CreateClient();
        client.AddAuthorizationHeader(token);
        
        return new AuthorizedClient
        {
            Client = client,
            UserId = user.Id,
            UserEmail = user.Email,
            OrganizationId = organizationId,
            Role = OrganizationRole.Member
        };
    }
    
    public static async Task<AuthorizedClient> CreateNonMemberClientAsync(
        TestWebApplicationFactory factory)
    {
        var (user, token) = await TestAuthenticationHelper.CreateAuthenticatedUserAsync(factory);
        var client = factory.CreateClient();
        client.AddAuthorizationHeader(token);
        
        return new AuthorizedClient
        {
            Client = client,
            UserId = user.Id,
            UserEmail = user.Email
        };
    }
    
    public static HttpClient CreateUnauthenticatedClient(TestWebApplicationFactory factory)
    {
        return factory.CreateClient();
    }
}
```

**Usage in Tests:**

```csharp
[Fact]
public async Task GetUsers_AsNonAdmin_ReturnsForbidden()
{
    // Arrange
    var nonAdmin = await AuthorizationTestFixtures.CreateNonMemberClientAsync(_factory);
    
    // Act
    var response = await nonAdmin.Client.GetAsync("/users");
    
    // Assert
    Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
}

[Fact]
public async Task GetUsers_AsGlobalAdmin_ReturnsOk()
{
    // Arrange
    var admin = await AuthorizationTestFixtures.CreateGlobalAdminClientAsync(_factory);
    
    // Act
    var response = await admin.Client.GetAsync("/users");
    
    // Assert
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
}
```

**Key Files to Reference:**
- `backend/FanEngagement.Tests/TestWebApplicationFactory.cs`
- `backend/FanEngagement.Tests/Helpers/TestAuthenticationHelper.cs`
- `backend/FanEngagement.Tests/Helpers/HttpClientExtensions.cs`
- `backend/FanEngagement.Tests/AuthorizationIntegrationTests.cs`

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Tests/Helpers/**` (new fixtures)
- `backend/FanEngagement.Tests/**` (sample tests demonstrating usage)

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test the work (`dotnet test`)
- Sample test demonstrating each fixture type
- Documentation of fixture API in test project README or code comments
- Confirmed adherence to architecture and test patterns
