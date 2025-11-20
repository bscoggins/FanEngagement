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
        // Only allow in Development environment
        if (!hostEnvironment.IsDevelopment())
        {
            return Forbid();
        }

        var result = await devDataSeedingService.SeedDevDataAsync(cancellationToken);
        return Ok(result);
    }
}
