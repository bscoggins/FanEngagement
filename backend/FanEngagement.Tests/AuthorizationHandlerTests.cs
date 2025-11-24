using System.Security.Claims;
using FanEngagement.Api.Authorization;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Tests;

public class AuthorizationHandlerTests
{
    private FanEngagementDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<FanEngagementDbContext>()
            .UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}")
            .Options;
        
        return new FanEngagementDbContext(options);
    }

    private ClaimsPrincipal CreateUser(Guid userId, string role = "User")
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role)
        };
        
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
    }

    private HttpContext CreateHttpContext(ClaimsPrincipal user, Dictionary<string, object?>? routeValues = null)
    {
        var httpContext = new DefaultHttpContext
        {
            User = user
        };

        if (routeValues != null)
        {
            httpContext.Request.RouteValues = new RouteValueDictionary(routeValues);
        }

        return httpContext;
    }

    [Fact]
    public async Task OrganizationMemberHandler_Succeeds_ForGlobalAdmin()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        
        var user = CreateUser(userId, "Admin");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["organizationId"] = orgId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new OrganizationMemberHandler(httpContextAccessor, dbContext);
        var requirement = new OrganizationMemberRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.True(authContext.HasSucceeded);
    }

    [Fact]
    public async Task OrganizationMemberHandler_Succeeds_ForOrgMember()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        
        // Add organization and membership to database
        var org = new Organization { Id = orgId, Name = "Test Org", CreatedAt = DateTimeOffset.UtcNow };
        var membership = new OrganizationMembership 
        { 
            Id = Guid.NewGuid(),
            UserId = userId, 
            OrganizationId = orgId, 
            Role = OrganizationRole.Member,
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(org);
        dbContext.OrganizationMemberships.Add(membership);
        await dbContext.SaveChangesAsync();
        
        var user = CreateUser(userId, "User");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["organizationId"] = orgId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new OrganizationMemberHandler(httpContextAccessor, dbContext);
        var requirement = new OrganizationMemberRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.True(authContext.HasSucceeded);
    }

    [Fact]
    public async Task OrganizationMemberHandler_Fails_ForNonMember()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        
        // Add organization but no membership
        var org = new Organization { Id = orgId, Name = "Test Org", CreatedAt = DateTimeOffset.UtcNow };
        dbContext.Organizations.Add(org);
        await dbContext.SaveChangesAsync();
        
        var user = CreateUser(userId, "User");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["organizationId"] = orgId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new OrganizationMemberHandler(httpContextAccessor, dbContext);
        var requirement = new OrganizationMemberRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.False(authContext.HasSucceeded);
    }

    [Fact]
    public async Task OrganizationMemberHandler_Succeeds_WithIdRouteParameter()
    {
        // Arrange - Test fallback to 'id' route parameter (used in OrganizationsController)
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        
        // Add organization and membership
        var org = new Organization { Id = orgId, Name = "Test Org", CreatedAt = DateTimeOffset.UtcNow };
        var membership = new OrganizationMembership 
        { 
            Id = Guid.NewGuid(),
            UserId = userId, 
            OrganizationId = orgId, 
            Role = OrganizationRole.Member,
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(org);
        dbContext.OrganizationMemberships.Add(membership);
        await dbContext.SaveChangesAsync();
        
        var user = CreateUser(userId, "User");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["id"] = orgId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new OrganizationMemberHandler(httpContextAccessor, dbContext);
        var requirement = new OrganizationMemberRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.True(authContext.HasSucceeded);
    }

    [Fact]
    public async Task OrganizationAdminHandler_Succeeds_ForGlobalAdmin()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        
        var user = CreateUser(userId, "Admin");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["organizationId"] = orgId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new OrganizationAdminHandler(httpContextAccessor, dbContext);
        var requirement = new OrganizationAdminRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.True(authContext.HasSucceeded);
    }

    [Fact]
    public async Task OrganizationAdminHandler_Succeeds_ForOrgAdmin()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        
        // Add organization and OrgAdmin membership
        var org = new Organization { Id = orgId, Name = "Test Org", CreatedAt = DateTimeOffset.UtcNow };
        var membership = new OrganizationMembership 
        { 
            Id = Guid.NewGuid(),
            UserId = userId, 
            OrganizationId = orgId, 
            Role = OrganizationRole.OrgAdmin,
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(org);
        dbContext.OrganizationMemberships.Add(membership);
        await dbContext.SaveChangesAsync();
        
        var user = CreateUser(userId, "User");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["organizationId"] = orgId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new OrganizationAdminHandler(httpContextAccessor, dbContext);
        var requirement = new OrganizationAdminRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.True(authContext.HasSucceeded);
    }

    [Fact]
    public async Task OrganizationAdminHandler_Fails_ForRegularMember()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        
        // Add organization and regular Member membership (not OrgAdmin)
        var org = new Organization { Id = orgId, Name = "Test Org", CreatedAt = DateTimeOffset.UtcNow };
        var membership = new OrganizationMembership 
        { 
            Id = Guid.NewGuid(),
            UserId = userId, 
            OrganizationId = orgId, 
            Role = OrganizationRole.Member,
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(org);
        dbContext.OrganizationMemberships.Add(membership);
        await dbContext.SaveChangesAsync();
        
        var user = CreateUser(userId, "User");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["organizationId"] = orgId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new OrganizationAdminHandler(httpContextAccessor, dbContext);
        var requirement = new OrganizationAdminRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.False(authContext.HasSucceeded);
    }

    [Fact]
    public async Task ProposalManagerHandler_Succeeds_ForGlobalAdmin()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var proposalId = Guid.NewGuid();
        
        var user = CreateUser(userId, "Admin");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["proposalId"] = proposalId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new ProposalManagerHandler(httpContextAccessor, dbContext);
        var requirement = new ProposalManagerRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.True(authContext.HasSucceeded);
    }

    [Fact]
    public async Task ProposalManagerHandler_Succeeds_ForProposalCreator()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var proposalId = Guid.NewGuid();
        
        // Add organization and proposal created by the user
        var org = new Organization { Id = orgId, Name = "Test Org", CreatedAt = DateTimeOffset.UtcNow };
        var proposal = new Proposal 
        { 
            Id = proposalId,
            OrganizationId = orgId,
            Title = "Test Proposal",
            CreatedByUserId = userId,
            Status = ProposalStatus.Open,
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(org);
        dbContext.Proposals.Add(proposal);
        await dbContext.SaveChangesAsync();
        
        var user = CreateUser(userId, "User");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["proposalId"] = proposalId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new ProposalManagerHandler(httpContextAccessor, dbContext);
        var requirement = new ProposalManagerRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.True(authContext.HasSucceeded);
    }

    [Fact]
    public async Task ProposalManagerHandler_Succeeds_ForOrgAdmin()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var creatorId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var proposalId = Guid.NewGuid();
        
        // Add organization, proposal created by someone else, and OrgAdmin membership for current user
        var org = new Organization { Id = orgId, Name = "Test Org", CreatedAt = DateTimeOffset.UtcNow };
        var proposal = new Proposal 
        { 
            Id = proposalId,
            OrganizationId = orgId,
            Title = "Test Proposal",
            CreatedByUserId = creatorId, // Different user
            Status = ProposalStatus.Open,
            CreatedAt = DateTimeOffset.UtcNow
        };
        var membership = new OrganizationMembership 
        { 
            Id = Guid.NewGuid(),
            UserId = userId, 
            OrganizationId = orgId, 
            Role = OrganizationRole.OrgAdmin,
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(org);
        dbContext.Proposals.Add(proposal);
        dbContext.OrganizationMemberships.Add(membership);
        await dbContext.SaveChangesAsync();
        
        var user = CreateUser(userId, "User");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["proposalId"] = proposalId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new ProposalManagerHandler(httpContextAccessor, dbContext);
        var requirement = new ProposalManagerRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.True(authContext.HasSucceeded);
    }

    [Fact]
    public async Task ProposalManagerHandler_Fails_ForRegularMember()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var creatorId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var proposalId = Guid.NewGuid();
        
        // Add organization, proposal created by someone else, and regular Member membership
        var org = new Organization { Id = orgId, Name = "Test Org", CreatedAt = DateTimeOffset.UtcNow };
        var proposal = new Proposal 
        { 
            Id = proposalId,
            OrganizationId = orgId,
            Title = "Test Proposal",
            CreatedByUserId = creatorId, // Different user
            Status = ProposalStatus.Open,
            CreatedAt = DateTimeOffset.UtcNow
        };
        var membership = new OrganizationMembership 
        { 
            Id = Guid.NewGuid(),
            UserId = userId, 
            OrganizationId = orgId, 
            Role = OrganizationRole.Member, // Not OrgAdmin
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(org);
        dbContext.Proposals.Add(proposal);
        dbContext.OrganizationMemberships.Add(membership);
        await dbContext.SaveChangesAsync();
        
        var user = CreateUser(userId, "User");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["proposalId"] = proposalId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new ProposalManagerHandler(httpContextAccessor, dbContext);
        var requirement = new ProposalManagerRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.False(authContext.HasSucceeded);
    }

    [Fact]
    public async Task ProposalMemberHandler_Succeeds_ForOrgMember()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var proposalId = Guid.NewGuid();
        
        // Add organization, proposal, and membership
        var org = new Organization { Id = orgId, Name = "Test Org", CreatedAt = DateTimeOffset.UtcNow };
        var proposal = new Proposal 
        { 
            Id = proposalId,
            OrganizationId = orgId,
            Title = "Test Proposal",
            CreatedByUserId = Guid.NewGuid(),
            Status = ProposalStatus.Open,
            CreatedAt = DateTimeOffset.UtcNow
        };
        var membership = new OrganizationMembership 
        { 
            Id = Guid.NewGuid(),
            UserId = userId, 
            OrganizationId = orgId, 
            Role = OrganizationRole.Member,
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(org);
        dbContext.Proposals.Add(proposal);
        dbContext.OrganizationMemberships.Add(membership);
        await dbContext.SaveChangesAsync();
        
        var user = CreateUser(userId, "User");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["proposalId"] = proposalId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new ProposalMemberHandler(httpContextAccessor, dbContext);
        var requirement = new OrganizationMemberRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.True(authContext.HasSucceeded);
    }

    [Fact]
    public async Task ProposalMemberHandler_Fails_ForNonMember()
    {
        // Arrange
        var dbContext = CreateInMemoryDbContext();
        var userId = Guid.NewGuid();
        var orgId = Guid.NewGuid();
        var proposalId = Guid.NewGuid();
        
        // Add organization and proposal but no membership for the user
        var org = new Organization { Id = orgId, Name = "Test Org", CreatedAt = DateTimeOffset.UtcNow };
        var proposal = new Proposal 
        { 
            Id = proposalId,
            OrganizationId = orgId,
            Title = "Test Proposal",
            CreatedByUserId = Guid.NewGuid(),
            Status = ProposalStatus.Open,
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(org);
        dbContext.Proposals.Add(proposal);
        await dbContext.SaveChangesAsync();
        
        var user = CreateUser(userId, "User");
        var httpContext = CreateHttpContext(user, new Dictionary<string, object?> { ["proposalId"] = proposalId.ToString() });
        var httpContextAccessor = new HttpContextAccessor { HttpContext = httpContext };
        
        var handler = new ProposalMemberHandler(httpContextAccessor, dbContext);
        var requirement = new OrganizationMemberRequirement();
        var authContext = new AuthorizationHandlerContext(new[] { requirement }, user, null);

        // Act
        await handler.HandleAsync(authContext);

        // Assert
        Assert.False(authContext.HasSucceeded);
    }
}
