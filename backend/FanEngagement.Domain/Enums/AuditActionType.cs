namespace FanEngagement.Domain.Enums;

public enum AuditActionType : short
{
    // Resource Lifecycle
    Created = 0,
    Updated = 1,
    Deleted = 2,

    // Access and Views
    Accessed = 10,
    Exported = 11,

    // Status and State Changes
    StatusChanged = 20,
    RoleChanged = 21,

    // Authentication and Authorization
    Authenticated = 30,
    AuthorizationDenied = 31,

    // Admin Operations
    AdminDataSeeded = 40,
    AdminDataReset = 41,
    AdminDataCleanup = 42
}
