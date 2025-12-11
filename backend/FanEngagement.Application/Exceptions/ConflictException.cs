using System;

namespace FanEngagement.Application.Exceptions;

/// <summary>
/// Represents an application-level conflict (HTTP 409) such as attempting to create a resource that already exists.
/// </summary>
public class ConflictException : Exception
{
    public ConflictException(string message) : base(message)
    {
    }
}
