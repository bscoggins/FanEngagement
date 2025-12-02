using System.Security.Claims;
using FanEngagement.Api.Helpers;
using FanEngagement.Application.Audit;
using FanEngagement.Application.DevDataSeeding;
using FanEngagement.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("admin")]
[Authorize(Roles = "Admin")]
public class AdminController(
    IDevDataSeedingService devDataSeedingService,
    IHostEnvironment hostEnvironment,
    IAuditService auditService) : ControllerBase
{
    /// <summary>
    /// Get available seeding scenarios.
    /// </summary>
    [HttpGet("seed-scenarios")]
    public ActionResult<IReadOnlyList<SeedScenarioInfo>> GetSeedScenarios()
    {
        var isDevOrDemo =
            hostEnvironment.IsDevelopment() ||
            string.Equals(hostEnvironment.EnvironmentName, "Demo", StringComparison.OrdinalIgnoreCase);

        if (!isDevOrDemo)
        {
            return Forbid();
        }

        return Ok(devDataSeedingService.GetAvailableScenarios());
    }

    /// <summary>
    /// Seed development data using the specified scenario.
    /// </summary>
    /// <param name="scenario">Optional scenario name (BasicDemo, HeavyProposals, WebhookFailures). Defaults to BasicDemo.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    [HttpPost("seed-dev-data")]
    public async Task<ActionResult<DevDataSeedingResult>> SeedDevData(
        [FromQuery] SeedScenario scenario = SeedScenario.BasicDemo,
        CancellationToken cancellationToken = default)
    {
        // Allow Dev + Demo only
        var isDevOrDemo =
            hostEnvironment.IsDevelopment() ||
            string.Equals(hostEnvironment.EnvironmentName, "Demo", StringComparison.OrdinalIgnoreCase);

        if (!isDevOrDemo)
        {
            return Forbid();
        }

        var result = await devDataSeedingService.SeedDevDataAsync(scenario, cancellationToken);

        // Audit the seeding operation
        await AuditAdminActionAsync(
            AuditActionType.AdminDataSeeded,
            new
            {
                scenario = scenario.ToString(),
                environment = hostEnvironment.EnvironmentName,
                organizationsCreated = result.OrganizationsCreated,
                usersCreated = result.UsersCreated,
                membershipsCreated = result.MembershipsCreated,
                shareTypesCreated = result.ShareTypesCreated,
                shareIssuancesCreated = result.ShareIssuancesCreated,
                proposalsCreated = result.ProposalsCreated,
                votesCreated = result.VotesCreated,
                webhookEndpointsCreated = result.WebhookEndpointsCreated,
                outboundEventsCreated = result.OutboundEventsCreated
            },
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("cleanup-e2e-data")]
    public async Task<ActionResult<E2eCleanupResult>> CleanupE2eData(CancellationToken cancellationToken)
    {
        var isDevOrDemo =
            hostEnvironment.IsDevelopment() ||
            string.Equals(hostEnvironment.EnvironmentName, "Demo", StringComparison.OrdinalIgnoreCase);

        if (!isDevOrDemo)
        {
            return Forbid();
        }

        var result = await devDataSeedingService.CleanupE2eDataAsync(cancellationToken);

        // Audit the cleanup operation
        await AuditAdminActionAsync(
            AuditActionType.AdminDataCleanup,
            new
            {
                environment = hostEnvironment.EnvironmentName,
                organizationsDeleted = result.OrganizationsDeleted
            },
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("reset-dev-data")]
    public async Task<ActionResult<TestDataResetResult>> ResetDevData(CancellationToken cancellationToken)
    {
        var isDevOrDemo =
            hostEnvironment.IsDevelopment() ||
            string.Equals(hostEnvironment.EnvironmentName, "Demo", StringComparison.OrdinalIgnoreCase);

        if (!isDevOrDemo)
        {
            return Forbid();
        }

        var result = await devDataSeedingService.ResetToSeedDataAsync(cancellationToken);

        // Audit the reset operation
        await AuditAdminActionAsync(
            AuditActionType.AdminDataReset,
            new
            {
                environment = hostEnvironment.EnvironmentName,
                scope = "AllData"
            },
            cancellationToken);

        return Ok(result);
    }

    /// <summary>
    /// Helper method to audit admin actions with consistent structure.
    /// </summary>
    private async Task AuditAdminActionAsync(
        AuditActionType actionType,
        object details,
        CancellationToken cancellationToken)
    {
        try
        {
            // Get admin user information from claims
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "Unknown Admin";

            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                // If we can't get user ID, still log the event but with system user
                userId = Guid.Empty;
            }

            // Get IP address
            var ipAddress = ClientContextHelper.GetClientIpAddress(HttpContext);

            // Build audit event
            var auditBuilder = new AuditEventBuilder()
                .WithActor(userId, userEmail)
                .WithIpAddress(ipAddress)
                .WithAction(actionType)
                .WithResource(AuditResourceType.SystemConfiguration, Guid.NewGuid(), "Admin Operation")
                .WithDetails(details)
                .AsSuccess();

            // Log asynchronously (fire-and-forget, failures won't affect the operation)
            await auditService.LogAsync(auditBuilder, cancellationToken);
        }
        catch
        {
            // Audit failures must not fail admin operations
            // The audit service already has internal error handling and logging
        }
    }
}
