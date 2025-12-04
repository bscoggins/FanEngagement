using FanEngagement.Api.Helpers;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.Mfa;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("Login")]
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

    [HttpPost("mfa/validate")]
    [AllowAnonymous]
    [EnableRateLimiting("MfaValidate")]
    public async Task<ActionResult<LoginResponse>> ValidateMfa([FromBody] MfaValidateRequest request, CancellationToken cancellationToken)
    {
        // Extract client context for audit logging
        var auditContext = new AuthenticationAuditContext
        {
            IpAddress = ClientContextHelper.GetClientIpAddress(HttpContext),
            UserAgent = ClientContextHelper.GetUserAgent(HttpContext)
        };

        var response = await authService.ValidateMfaAsync(request.UserId, request.Code, auditContext, cancellationToken);
        
        if (response == null)
        {
            return Unauthorized(new { message = "Invalid MFA code" });
        }

        return Ok(response);
    }
}
