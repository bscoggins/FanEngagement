namespace FanEngagement.Api.Exceptions;

/// <summary>
/// Exception thrown when a requested resource is not found.
/// </summary>
public class ResourceNotFoundException : Exception
{
    public string ResourceType { get; }
    public object ResourceId { get; }

    public ResourceNotFoundException(string resourceType, object resourceId)
        : base($"{resourceType} with ID '{resourceId}' was not found.")
    {
        ResourceType = resourceType;
        ResourceId = resourceId;
    }

    public ResourceNotFoundException(string message)
        : base(message)
    {
        ResourceType = "Unknown";
        ResourceId = "Unknown";
    }
}
