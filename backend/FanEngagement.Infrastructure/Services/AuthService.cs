using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Authentication;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace FanEngagement.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly FanEngagementDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;
    private readonly IAuditService _auditService;

    public AuthService(
        FanEngagementDbContext dbContext, 
        IConfiguration configuration, 
        ILogger<AuthService> logger,
        IAuditService auditService)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
        _auditService = auditService;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request, AuthenticationAuditContext? auditContext = null, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (user == null)
        {
            // Audit failed login attempt - user not found
            await LogFailedLoginAsync(request.Email, "Invalid credentials", auditContext, cancellationToken);
            return null;
        }

        if (!VerifyPassword(request.Password, user.PasswordHash))
        {
            // Audit failed login attempt - invalid password
            await LogFailedLoginAsync(request.Email, "Invalid credentials", auditContext, cancellationToken);
            return null;
        }

        var token = GenerateJwtToken(user.Id, user.Email, user.Role.ToString());

        // Audit successful login
        await LogSuccessfulLoginAsync(user, auditContext, cancellationToken);

        return new LoginResponse
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            Role = user.Role.ToString()
        };
    }

    public string HashPassword(string password)
    {
        // Use PBKDF2-SHA256 for password hashing
        const int saltSize = 16;
        const int hashSize = 32;
        const int iterations = 100000;

        using var rng = RandomNumberGenerator.Create();
        var salt = new byte[saltSize];
        rng.GetBytes(salt);

        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
        var hash = pbkdf2.GetBytes(hashSize);

        var hashBytes = new byte[saltSize + hashSize];
        Array.Copy(salt, 0, hashBytes, 0, saltSize);
        Array.Copy(hash, 0, hashBytes, saltSize, hashSize);

        return Convert.ToBase64String(hashBytes);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        const int saltSize = 16;
        const int hashSize = 32;
        const int iterations = 100000;

        try
        {
            var hashBytes = Convert.FromBase64String(passwordHash);

            if (hashBytes.Length != saltSize + hashSize)
            {
                return false;
            }

            var salt = new byte[saltSize];
            Array.Copy(hashBytes, 0, salt, 0, saltSize);

            using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iterations, HashAlgorithmName.SHA256);
            var hash = pbkdf2.GetBytes(hashSize);

            for (int i = 0; i < hashSize; i++)
            {
                if (hashBytes[i + saltSize] != hash[i])
                {
                    return false;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Password verification failed due to exception. This may indicate a corrupted password hash or invalid data format.");
            return false;
        }
    }

    private string GenerateJwtToken(Guid userId, string email, string role)
    {
        var issuer = _configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("JWT Issuer is not configured");
        var audience = _configuration["Jwt:Audience"] ?? throw new InvalidOperationException("JWT Audience is not configured");
        var signingKey = _configuration["Jwt:SigningKey"] ?? throw new InvalidOperationException("JWT SigningKey is not configured");

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Logs a successful login audit event.
    /// </summary>
    private async Task LogSuccessfulLoginAsync(
        Domain.Entities.User user, 
        AuthenticationAuditContext? auditContext, 
        CancellationToken cancellationToken)
    {
        try
        {
            var builder = new AuditEventBuilder()
                .WithActor(user.Id, user.DisplayName)
                .WithAction(AuditActionType.Authenticated)
                .WithResource(AuditResourceType.User, user.Id, user.Email)
                .AsSuccess();

            // Add IP address if available
            if (auditContext?.IpAddress != null)
                builder.WithIpAddress(auditContext.IpAddress);

            // Add additional client context to details
            if (auditContext?.UserAgent != null)
            {
                builder.WithDetails(new { UserAgent = auditContext.UserAgent });
            }

            await _auditService.LogAsync(builder, cancellationToken);
        }
        catch (Exception ex)
        {
            // Log but don't propagate audit failures
            _logger.LogError(ex, "Failed to log successful login audit event for user {UserId}", user.Id);
        }
    }

    /// <summary>
    /// Logs a failed login audit event.
    /// Uses generic failure reason to prevent credential enumeration.
    /// 
    /// Rate-limiting: Audit events are logged asynchronously via a bounded channel.
    /// If the channel is full (due to excessive failed login attempts), events will be
    /// dropped with a warning logged. This provides natural rate-limit protection.
    /// For additional rate-limiting, consider implementing IP-based throttling at the
    /// API gateway or reverse proxy level.
    /// </summary>
    private async Task LogFailedLoginAsync(
        string attemptedEmail, 
        string reason, 
        AuthenticationAuditContext? auditContext, 
        CancellationToken cancellationToken)
    {
        try
        {
            // Use a synthetic resource ID for failed login attempts
            // This prevents exposing whether a user account exists
            var syntheticResourceId = Guid.NewGuid();

            var builder = new AuditEventBuilder()
                .WithAction(AuditActionType.Authenticated)
                .WithResource(AuditResourceType.User, syntheticResourceId, attemptedEmail)
                .AsFailure(reason);

            // Add IP address if available
            if (auditContext?.IpAddress != null)
                builder.WithIpAddress(auditContext.IpAddress);

            // Add additional client context to details
            if (auditContext?.UserAgent != null)
            {
                builder.WithDetails(new { UserAgent = auditContext.UserAgent });
            }

            await _auditService.LogAsync(builder, cancellationToken);
        }
        catch (Exception ex)
        {
            // Log but don't propagate audit failures
            _logger.LogError(ex, "Failed to log failed login audit event for email {Email}", attemptedEmail);
        }
    }
}
