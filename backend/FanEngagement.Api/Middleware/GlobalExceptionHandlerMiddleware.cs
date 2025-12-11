using System.Net;
using System.Text.Json;
using FanEngagement.Application.Exceptions;
using FanEngagement.Api.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace FanEngagement.Api.Middleware;

/// <summary>
/// Middleware that catches unhandled exceptions and returns structured error responses using RFC 7807 ProblemDetails.
/// </summary>
public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionHandlerMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionHandlerMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        // Check if response has already started
        if (context.Response.HasStarted)
        {
            _logger.LogWarning("Cannot handle exception - response has already started");
            return;
        }

        // Log at a lower level for expected/handled exceptions to reduce noisy error output in tests and normal flows.
        var logLevel = exception switch
        {
            DomainValidationException => LogLevel.Warning,
            ResourceNotFoundException => LogLevel.Warning,
            ConflictException => LogLevel.Information,
            InvalidOperationException => LogLevel.Information,
            ArgumentException => LogLevel.Warning,
            _ => LogLevel.Error
        };

        var logTemplate = logLevel == LogLevel.Error
            ? "An unhandled exception occurred: {Message}"
            : "A handled application exception occurred: {Message}";

        _logger.Log(logLevel, exception, logTemplate, exception.Message);

        var problemDetails = CreateProblemDetails(context, exception);

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = problemDetails.Status ?? (int)HttpStatusCode.InternalServerError;

        var json = JsonSerializer.Serialize(problemDetails, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        });

        await context.Response.WriteAsync(json);
    }

    private ProblemDetails CreateProblemDetails(HttpContext context, Exception exception)
    {
        return exception switch
        {
            DomainValidationException domainEx => new ProblemDetails
            {
                Status = (int)HttpStatusCode.BadRequest,
                Title = "Domain Validation Error",
                Detail = domainEx.Message,
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                Instance = context.Request.Path,
                Extensions =
                {
                    ["errorCode"] = domainEx.ErrorCode,
                    ["validationErrors"] = domainEx.ValidationErrors ?? new Dictionary<string, string[]>()
                }
            },
            ResourceNotFoundException notFoundEx => new ProblemDetails
            {
                Status = (int)HttpStatusCode.NotFound,
                Title = "Resource Not Found",
                Detail = notFoundEx.Message,
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.4",
                Instance = context.Request.Path,
                Extensions =
                {
                    ["resourceType"] = notFoundEx.ResourceType,
                    ["resourceId"] = notFoundEx.ResourceId != null ? notFoundEx.ResourceId.ToString() : "Unknown"
                }
            },
            ConflictException conflictEx => new ProblemDetails
            {
                Status = (int)HttpStatusCode.Conflict,
                Title = "Conflict",
                Detail = conflictEx.Message,
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.8",
                Instance = context.Request.Path
            },
            InvalidOperationException invalidOpEx => new ProblemDetails
            {
                Status = (int)HttpStatusCode.BadRequest,
                Title = "Invalid Operation",
                Detail = invalidOpEx.Message,
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                Instance = context.Request.Path
            },
            ArgumentException argEx => new ProblemDetails
            {
                Status = (int)HttpStatusCode.BadRequest,
                Title = "Invalid Argument",
                Detail = argEx.Message,
                Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1",
                Instance = context.Request.Path,
                Extensions =
                {
                    ["parameterName"] = argEx.ParamName ?? "Unknown"
                }
            },
            _ => new ProblemDetails
            {
                Status = (int)HttpStatusCode.InternalServerError,
                Title = "Internal Server Error",
                Detail = _environment.IsDevelopment()
                    ? exception.Message
                    : "An unexpected error occurred. Please try again later.",
                Type = "https://tools.ietf.org/html/rfc7231#section-6.6.1",
                Instance = context.Request.Path,
                Extensions = _environment.IsDevelopment()
                    ? new Dictionary<string, object?>
                    {
                        ["exceptionType"] = exception.GetType().FullName,
                        ["stackTrace"] = exception.StackTrace
                    }
                    : new Dictionary<string, object?>()
            }
        };
    }
}
