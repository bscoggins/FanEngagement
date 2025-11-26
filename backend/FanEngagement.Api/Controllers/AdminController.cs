using FanEngagement.Application.DevDataSeeding;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("admin")]
[Authorize(Roles = "Admin")]
public class AdminController(IDevDataSeedingService devDataSeedingService, IHostEnvironment hostEnvironment) : ControllerBase
{
    [HttpPost("seed-dev-data")]
    public async Task<ActionResult<DevDataSeedingResult>> SeedDevData(CancellationToken cancellationToken)
    {
        // Allow Dev + Demo only
        var isDevOrDemo =
            hostEnvironment.IsDevelopment() ||
            string.Equals(hostEnvironment.EnvironmentName, "Demo", StringComparison.OrdinalIgnoreCase);

        if (!isDevOrDemo)
        {
            return Forbid();
        }

        var result = await devDataSeedingService.SeedDevDataAsync(cancellationToken);
        return Ok(result);
    }
}
