using Microsoft.AspNetCore.Routing;

namespace FanEngagement.Api.Authorization;

/// <summary>
/// Helper methods for extracting values from route data.
/// </summary>
public static class RouteValueHelpers
{
    /// <summary>
    /// Attempts to extract an organizationId from route values.
    /// Tries both 'organizationId' and 'id' route parameters.
    /// </summary>
    /// <param name="routeValues">The route value dictionary from the HTTP request.</param>
    /// <param name="organizationId">The extracted organization ID if successful.</param>
    /// <returns>True if an organization ID was found and parsed; otherwise, false.</returns>
    public static bool TryGetOrganizationId(RouteValueDictionary routeValues, out Guid organizationId)
    {
        if (routeValues.TryGetValue("organizationId", out var orgIdObj) && Guid.TryParse(orgIdObj?.ToString(), out organizationId))
        {
            return true;
        }
        
        if (routeValues.TryGetValue("id", out var idObj) && Guid.TryParse(idObj?.ToString(), out organizationId))
        {
            return true;
        }

        organizationId = Guid.Empty;
        return false;
    }
}
