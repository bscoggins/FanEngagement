using FanEngagement.Application.DevDataSeeding;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("admin")]
[Authorize(Roles = "Admin")]
public class AdminController(IDevDataSeedingService devDataSeedingService, IHostEnvironment hostEnvironment) : ControllerBase
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
        return Ok(result);
    }
}
