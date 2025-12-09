using FanEngagement.Application.Audit;
using FanEngagement.Application.Common;
using FanEngagement.Application.Encryption;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Mfa;
using FanEngagement.Application.Users;
using FanEngagement.Application.Validators;
using FanEngagement.Api.Helpers;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("users")]
[Authorize]
public class UsersController(
    IUserService userService, 
    IMembershipService membershipService,
    IMfaService mfaService,
    IEncryptionService encryptionService,
    IAuditService auditService,
    ILogger<UsersController> logger,
    FanEngagementDbContext dbContext) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting("Registration")]
    public async Task<ActionResult> Create([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await userService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpGet]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult> GetAll(
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        // If pagination parameters are provided, use paginated endpoint
        if (page.HasValue || pageSize.HasValue || !string.IsNullOrWhiteSpace(search))
        {
            var currentPage = page ?? PaginationValidators.DefaultPage;
            var currentPageSize = pageSize ?? PaginationValidators.DefaultPageSize;

            // Validate pagination parameters
            var validationError = PaginationHelper.ValidatePaginationParameters(currentPage, currentPageSize);
            if (validationError != null)
            {
                return validationError;
            }

            var pagedResult = await userService.GetAllAsync(currentPage, currentPageSize, search, cancellationToken);
            return Ok(pagedResult);
        }

        // Legacy endpoint - return all users without pagination
        var users = await userService.GetAllAsync(cancellationToken);
        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await userService.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(user);
    }

    [HttpGet("me/organizations")]
    public async Task<ActionResult> GetMyOrganizations(CancellationToken cancellationToken)
    {
        // Get the current user's ID from the JWT token
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Forbid();
        }

        var memberships = await membershipService.GetByUserIdAsync(userId, cancellationToken);
        return Ok(memberships);
    }

    [HttpGet("{id:guid}/memberships")]
    public async Task<ActionResult> GetUserMemberships(Guid id, CancellationToken cancellationToken)
    {
        // Only allow access if the requesting user is the target user or has Admin role
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var requestingUserId))
        {
            return Forbid();
        }

        // Allow if user is viewing their own memberships or is an Admin
        if (requestingUserId != id && !User.IsInRole("Admin"))
        {
            return Forbid();
        }

        var memberships = await membershipService.GetByUserIdAsync(id, cancellationToken);
        return Ok(memberships);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await userService.UpdateAsync(id, request, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(user);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await userService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpGet("admin/stats")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> GetAdminStats(CancellationToken cancellationToken)
    {
        var users = await userService.GetAllAsync(cancellationToken);
        var stats = new
        {
            TotalUsers = users.Count,
            Message = "This endpoint is only accessible to administrators"
        };
        return Ok(stats);
    }

    [HttpPost("me/mfa/setup")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<MfaSetupResult>> SetupMfa(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Forbid();
        }

        var user = await dbContext.Users.FindAsync([userId], cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        // Generate MFA setup
        var setupResult = mfaService.GenerateSetup(userId, user.Email);

        // Audit MFA setup initiation
        try
        {
            var auditEvent = new AuditEventBuilder()
                .WithActor(userId, user.DisplayName)
                .WithAction(AuditActionType.Updated)
                .WithResource(AuditResourceType.User, userId, user.Email)
                .WithDetails(new { Action = "MFA_SETUP_INITIATED" })
                .AsSuccess()
                .Build();
            
            await auditService.LogAsync(auditEvent, cancellationToken);
        }
        catch (Exception ex)
        {
            // Log but don't fail the operation
            logger.LogWarning(ex, "Failed to log MFA setup audit");
        }

        return Ok(setupResult);
    }

    [HttpPost("me/mfa/enable")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> EnableMfa([FromBody] MfaEnableRequest request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Forbid();
        }

        var user = await dbContext.Users.FindAsync([userId], cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        // Validate the TOTP code before enabling
        if (!mfaService.ValidateTotp(request.SecretKey, request.TotpCode))
        {
            return BadRequest(new { message = "Invalid TOTP code. Please verify the code from your authenticator app." });
        }

        // Generate and hash backup codes
        var backupCodes = mfaService.GenerateBackupCodes();
        var hashedBackupCodes = mfaService.HashBackupCodes(backupCodes);

        // Encrypt the MFA secret before storing
        var encryptedSecret = encryptionService.Encrypt(request.SecretKey);

        // Enable MFA for the user
        user.MfaEnabled = true;
        user.MfaSecret = encryptedSecret;
        user.MfaBackupCodesHash = hashedBackupCodes;

        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit MFA enable
        try
        {
            var auditEvent = new AuditEventBuilder()
                .WithActor(userId, user.DisplayName)
                .WithAction(AuditActionType.Updated)
                .WithResource(AuditResourceType.User, userId, user.Email)
                .WithDetails(new { Action = "MFA_ENABLED" })
                .AsSuccess()
                .Build();
            
            await auditService.LogAsync(auditEvent, cancellationToken);
        }
        catch (Exception ex)
        {
            // Log but don't fail the operation
            logger.LogWarning(ex, "Failed to log MFA enable audit");
        }

        return Ok(new { message = "MFA enabled successfully", backupCodes });
    }

    [HttpPost("me/mfa/disable")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DisableMfa([FromBody] MfaDisableRequest request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Forbid();
        }

        var user = await dbContext.Users.FindAsync([userId], cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        if (!user.MfaEnabled || string.IsNullOrWhiteSpace(user.MfaSecret))
        {
            return BadRequest(new { message = "MFA is not enabled for this account." });
        }

        // Decrypt the MFA secret before validation
        var decryptedSecret = encryptionService.Decrypt(user.MfaSecret);
        
        // Validate either TOTP or backup code
        bool isValid = mfaService.ValidateTotp(decryptedSecret, request.Code);
        
        if (!isValid && !string.IsNullOrWhiteSpace(user.MfaBackupCodesHash))
        {
            isValid = mfaService.ValidateBackupCode(user.MfaBackupCodesHash, request.Code);
        }

        if (!isValid)
        {
            return BadRequest(new { message = "Invalid code. Please provide a valid TOTP code or backup code." });
        }

        // Disable MFA
        user.MfaEnabled = false;
        user.MfaSecret = null;
        user.MfaBackupCodesHash = null;

        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit MFA disable
        try
        {
            var auditEvent = new AuditEventBuilder()
                .WithActor(userId, user.DisplayName)
                .WithAction(AuditActionType.Updated)
                .WithResource(AuditResourceType.User, userId, user.Email)
                .WithDetails(new { Action = "MFA_DISABLED" })
                .AsSuccess()
                .Build();
            
            await auditService.LogAsync(auditEvent, cancellationToken);
        }
        catch (Exception ex)
        {
            // Log but don't fail the operation
            logger.LogWarning(ex, "Failed to log MFA disable audit");
        }

        return Ok(new { message = "MFA disabled successfully" });
    }

    [HttpGet("me/mfa/status")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> GetMfaStatus(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Forbid();
        }

        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        
        if (user is null)
        {
            return NotFound();
        }

        return Ok(new { mfaEnabled = user.MfaEnabled });
    }

    [HttpPost("me/password")]
    [Authorize]
    public async Task<ActionResult> ChangeMyPassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Forbid();
        }

        try
        {
            var success = await userService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword, cancellationToken);
            if (!success)
            {
                return NotFound();
            }

            return Ok(new { message = "Password changed successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/password")]
    [Authorize(Policy = "GlobalAdmin")]
    public async Task<ActionResult> SetUserPassword(Guid id, [FromBody] SetPasswordRequest request, CancellationToken cancellationToken)
    {
        // Get the current admin user info for audit logging
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var userNameClaim = User.Identity?.Name ?? "Unknown Admin";
        
        if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var actorId))
        {
            return Forbid();
        }

        var success = await userService.SetPasswordAsync(id, request.NewPassword, actorId, userNameClaim, cancellationToken);
        if (!success)
        {
            return NotFound();
        }

        return Ok(new { message = "Password set successfully" });
    }
}
