namespace FanEngagement.Api.Middleware;

/// <summary>
/// Middleware that generates or propagates a correlation ID for each request.
/// The correlation ID is:
/// - Read from the X-Correlation-ID request header if present
/// - Generated as a new GUID if not present
/// - Added to the response headers as X-Correlation-ID
/// - Added to the ILogger scope for structured logging
/// </summary>
public class CorrelationIdMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;
    private const string CorrelationIdHeaderName = "X-Correlation-ID";

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Get or generate correlation ID
        var correlationId = context.Request.Headers[CorrelationIdHeaderName].FirstOrDefault()
            ?? Guid.NewGuid().ToString();

        // Add to response headers (only if response hasn't started yet)
        if (!context.Response.HasStarted)
        {
            context.Response.Headers[CorrelationIdHeaderName] = correlationId;
        }

        // Add to logger scope for all subsequent logging in this request
        using (_logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["RequestPath"] = context.Request.Path.Value ?? string.Empty,
            ["RequestMethod"] = context.Request.Method
        }))
        {
            await _next(context);
        }
    }
}
