using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FanEngagement.Api.Helpers;

/// <summary>
/// Helper class for common controller operations
/// </summary>
public static class ControllerHelper
{
    /// <summary>
    /// Extracts the actor user ID and display name from the current HTTP context claims.
    /// </summary>
    /// <param name="controller">The controller instance</param>
    /// <returns>A tuple containing the actor user ID and display name</returns>
    /// <exception cref="InvalidOperationException">Thrown when the user ID claim is missing or invalid. This should never happen with proper authentication middleware.</exception>
    public static (Guid ActorUserId, string ActorDisplayName) GetActorInfo(this ControllerBase controller)
    {
        var userIdClaim = controller.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var actorUserId))
        {
            throw new InvalidOperationException("User ID claim is missing or invalid. This indicates a configuration issue with authentication middleware.");
        }

        var actorDisplayName = controller.User.FindFirst(ClaimTypes.Name)?.Value 
                              ?? controller.User.FindFirst(ClaimTypes.Email)?.Value 
                              ?? "Unknown";

        return (actorUserId, actorDisplayName);
    }
}
