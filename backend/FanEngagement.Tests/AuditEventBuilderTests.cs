using FanEngagement.Application.Audit;
using FanEngagement.Domain.Enums;
using Xunit;

namespace FanEngagement.Tests;

public class AuditEventBuilderTests
{
    [Fact]
    public void Build_WithRequiredFields_ReturnsValidEvent()
    {
        // Arrange
        var builder = new AuditEventBuilder()
            .WithActor(Guid.NewGuid(), "Test User")
            .WithAction(AuditActionType.Created)
            .WithResource(AuditResourceType.Proposal, Guid.NewGuid(), "Test Proposal");

        // Act
        var result = builder.Build();

        // Assert
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(AuditActionType.Created, result.ActionType);
        Assert.Equal(AuditResourceType.Proposal, result.ResourceType);
        Assert.Equal(AuditOutcome.Success, result.Outcome);
    }

    [Fact]
    public void Build_WithoutCallingWithResource_ThrowsInvalidOperationException()
    {
        // Arrange
        var builder = new AuditEventBuilder()
            .WithAction(AuditActionType.Created);

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => builder.Build());
    }

    [Fact]
    public void Build_WithoutResourceId_ThrowsInvalidOperationException()
    {
        // Arrange
        var builder = new AuditEventBuilder()
            .WithResource(AuditResourceType.Proposal, Guid.Empty);

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => builder.Build());
    }

    [Fact]
    public void WithDetails_SerializesObjectToJson()
    {
        // Arrange
        var builder = new AuditEventBuilder()
            .WithResource(AuditResourceType.Proposal, Guid.NewGuid())
            .WithDetails(new { Status = "Draft", Title = "Test" });

        // Act
        var result = builder.Build();

        // Assert
        Assert.NotNull(result.Details);
        Assert.Contains("\"status\":\"Draft\"", result.Details);
        Assert.Contains("\"title\":\"Test\"", result.Details);
    }

    [Fact]
    public void AsFailure_TruncatesLongReasons()
    {
        // Arrange
        var longReason = new string('x', 2000);
        var builder = new AuditEventBuilder()
            .WithResource(AuditResourceType.Proposal, Guid.NewGuid())
            .AsFailure(longReason);

        // Act
        var result = builder.Build();

        // Assert
        Assert.NotNull(result.FailureReason);
        Assert.True(result.FailureReason.Length <= 1000);
        Assert.EndsWith("...[truncated]", result.FailureReason);
    }

    [Fact]
    public void WithOrganization_SetsOrganizationFields()
    {
        // Arrange
        var orgId = Guid.NewGuid();
        var orgName = "Test Org";
        var builder = new AuditEventBuilder()
            .WithResource(AuditResourceType.Proposal, Guid.NewGuid())
            .WithOrganization(orgId, orgName);

        // Act
        var result = builder.Build();

        // Assert
        Assert.Equal(orgId, result.OrganizationId);
        Assert.Equal(orgName, result.OrganizationName);
    }

    [Fact]
    public void AsSuccess_SetsSuccessOutcome()
    {
        // Arrange
        var builder = new AuditEventBuilder()
            .WithResource(AuditResourceType.Proposal, Guid.NewGuid())
            .AsSuccess();

        // Act
        var result = builder.Build();

        // Assert
        Assert.Equal(AuditOutcome.Success, result.Outcome);
        Assert.Null(result.FailureReason);
    }

    [Fact]
    public void AsDenied_SetsDeniedOutcome()
    {
        // Arrange
        var reason = "Insufficient permissions";
        var builder = new AuditEventBuilder()
            .WithResource(AuditResourceType.Proposal, Guid.NewGuid())
            .AsDenied(reason);

        // Act
        var result = builder.Build();

        // Assert
        Assert.Equal(AuditOutcome.Denied, result.Outcome);
        Assert.Equal(reason, result.FailureReason);
    }

    [Fact]
    public void FluentApi_AllowsMethodChaining()
    {
        // Arrange & Act
        var userId = Guid.NewGuid();
        var resourceId = Guid.NewGuid();
        var orgId = Guid.NewGuid();

        var result = new AuditEventBuilder()
            .WithActor(userId, "Test User")
            .WithIpAddress("192.168.1.1")
            .WithAction(AuditActionType.Created)
            .WithResource(AuditResourceType.Proposal, resourceId, "Test Proposal")
            .WithOrganization(orgId, "Test Org")
            .WithCorrelationId("correlation-123")
            .WithDetails(new { Key = "Value" })
            .AsSuccess()
            .Build();

        // Assert
        Assert.Equal(userId, result.ActorUserId);
        Assert.Equal("Test User", result.ActorDisplayName);
        Assert.Equal("192.168.1.1", result.ActorIpAddress);
        Assert.Equal(AuditActionType.Created, result.ActionType);
        Assert.Equal(AuditResourceType.Proposal, result.ResourceType);
        Assert.Equal(resourceId, result.ResourceId);
        Assert.Equal("Test Proposal", result.ResourceName);
        Assert.Equal(orgId, result.OrganizationId);
        Assert.Equal("Test Org", result.OrganizationName);
        Assert.Equal("correlation-123", result.CorrelationId);
        Assert.NotNull(result.Details);
        Assert.Equal(AuditOutcome.Success, result.Outcome);
    }

    [Fact]
    public void Build_WithUserResourceType_WorksCorrectly()
    {
        // This test verifies the fix for the enum default value bug
        // User = 0 is a valid ResourceType even though it equals default(AuditResourceType)
        
        // Arrange
        var userId = Guid.NewGuid();
        var builder = new AuditEventBuilder()
            .WithAction(AuditActionType.Created)
            .WithResource(AuditResourceType.User, userId, "Test User");

        // Act
        var result = builder.Build();

        // Assert
        Assert.Equal(AuditResourceType.User, result.ResourceType);
        Assert.Equal(userId, result.ResourceId);
        Assert.Equal("Test User", result.ResourceName);
    }
}
