using FanEngagement.Api.Helpers;
using FanEngagement.Application.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        // Extract client context for audit logging
        var auditContext = new AuthenticationAuditContext
        {
            IpAddress = ClientContextHelper.GetClientIpAddress(HttpContext),
            UserAgent = ClientContextHelper.GetUserAgent(HttpContext)
        };

        var response = await authService.LoginAsync(request, auditContext, cancellationToken);
        
        if (response == null)
        {
            return Unauthorized();
        }

        return Ok(response);
    }
}
