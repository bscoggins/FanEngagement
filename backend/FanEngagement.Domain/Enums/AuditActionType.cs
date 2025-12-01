namespace FanEngagement.Domain.Enums;

public enum AuditActionType : short
{
    // Resource Lifecycle
    Created = 1,
    Updated = 2,
    Deleted = 3,

    // Access and Views
    Accessed = 10,
    Exported = 11,

    // Status and State Changes
    StatusChanged = 20,
    RoleChanged = 21,

    // Authentication and Authorization
    Authenticated = 30,
    AuthorizationDenied = 31
}
