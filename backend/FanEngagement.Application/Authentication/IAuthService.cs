namespace FanEngagement.Application.Authentication;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, AuthenticationAuditContext? auditContext = null, CancellationToken cancellationToken = default);
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}
