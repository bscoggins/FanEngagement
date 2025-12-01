using System.Security.Claims;
using FanEngagement.Api.Helpers;
using FanEngagement.Application.Audit;
using FanEngagement.Domain.Enums;

namespace FanEngagement.Api.Middleware;

/// <summary>
/// Middleware that captures audit events for authorization failures (403 Forbidden responses).
/// This middleware is positioned between authentication and authorization, but checks the response after the pipeline executes to capture 403 Forbidden responses.
/// </summary>
public class AuditingAuthorizationMiddleware(
    RequestDelegate next,
    ILogger<AuditingAuthorizationMiddleware> logger)
{
    private const string CorrelationIdHeaderName = "X-Correlation-ID";

    public async Task InvokeAsync(HttpContext context, IAuditService auditService)
    {
        await next(context);

        // Only audit 403 Forbidden responses (authorization failures)
        if (context.Response.StatusCode == StatusCodes.Status403Forbidden)
        {
            await AuditAuthorizationFailureAsync(context, auditService);
        }
    }

    private async Task AuditAuthorizationFailureAsync(HttpContext context, IAuditService auditService)
    {
        try
        {
            // Extract user information
            var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var displayName = context.User.FindFirst(ClaimTypes.Name)?.Value
                              ?? context.User.FindFirst(ClaimTypes.Email)?.Value
                              ?? "Anonymous";

            // Extract request information
            var requestPath = context.Request.Path.Value ?? string.Empty;
            var requestMethod = context.Request.Method;
            var ipAddress = ClientContextHelper.GetClientIpAddress(context);
            var correlationId = context.Request.Headers[CorrelationIdHeaderName].FirstOrDefault();

            // Extract user's roles for context
            var userRoles = context.User.Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value)
                .ToList();

            // Build audit event
            // For system-level authorization failures, we create a deterministic GUID from the request path
            // so that multiple failures on the same endpoint can be correlated
            var resourceId = GenerateResourceIdForPath(requestPath);
            
            var builder = new AuditEventBuilder()
                .WithAction(AuditActionType.AuthorizationDenied)
                .WithResource(AuditResourceType.SystemConfiguration, resourceId, requestPath)
                .AsDenied($"Access denied to {requestMethod} {requestPath}")
                .WithDetails(new
                {
                    requestMethod,
                    requestPath,
                    userRoles,
                    statusCode = 403
                });

            if (Guid.TryParse(userId, out var userGuid))
            {
                builder.WithActor(userGuid, displayName);
            }

            if (!string.IsNullOrWhiteSpace(ipAddress))
            {
                builder.WithIpAddress(ipAddress);
            }

            if (!string.IsNullOrWhiteSpace(correlationId))
            {
                builder.WithCorrelationId(correlationId);
            }

            // Log audit event asynchronously (fire-and-forget)
            await auditService.LogAsync(builder);

            logger.LogWarning(
                "Authorization denied: User {UserId} ({DisplayName}) attempted {Method} {Path}",
                userId ?? "Anonymous",
                displayName,
                requestMethod,
                requestPath);
        }
        catch (Exception ex)
        {
            // Never propagate audit failures
            logger.LogError(ex, "Failed to audit authorization failure");
        }
    }

    /// <summary>
    /// Generates a deterministic GUID from a request path for resource correlation.
    /// This allows multiple authorization failures on the same endpoint to be grouped together.
    /// </summary>
    private static Guid GenerateResourceIdForPath(string path)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hash = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(path));
        // Take first 16 bytes of the 32-byte SHA256 hash
        return new Guid(hash.Take(16).ToArray());
    }
}
