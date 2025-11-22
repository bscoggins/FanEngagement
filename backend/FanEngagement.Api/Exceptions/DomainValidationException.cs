namespace FanEngagement.Api.Exceptions;

/// <summary>
/// Exception thrown when domain business rules are violated.
/// </summary>
public class DomainValidationException : Exception
{
    public string ErrorCode { get; }
    public Dictionary<string, string[]>? ValidationErrors { get; }

    public DomainValidationException(string message, string errorCode = "DOMAIN_VALIDATION_ERROR")
        : base(message)
    {
        ErrorCode = errorCode;
    }

    public DomainValidationException(string message, Dictionary<string, string[]> validationErrors, string errorCode = "DOMAIN_VALIDATION_ERROR")
        : base(message)
    {
        ErrorCode = errorCode;
        ValidationErrors = validationErrors;
    }

    public DomainValidationException(string message, Exception innerException, string errorCode = "DOMAIN_VALIDATION_ERROR")
        : base(message, innerException)
    {
        ErrorCode = errorCode;
    }
}
