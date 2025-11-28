---
name: "Coding Task"
about: "Implement rate limiting"
title: "[Dev] E-006-06: Implement Rate Limiting"
labels: ["development", "copilot", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Implement rate limiting on authentication and sensitive API endpoints to mitigate brute force attacks and API abuse.

This story is part of **Epic E-006: Security Documentation Update and Enhancements**.

**Reference:** `docs/product/security-authorization-research-report.md`

---

## 2. Requirements

- Add rate limiting middleware or library
- Configure rate limits for login endpoint
- Configure rate limits for user creation endpoint
- Return 429 Too Many Requests when limits exceeded
- Include appropriate headers (Retry-After, X-RateLimit-*)
- Follow existing middleware patterns in the repository

---

## 3. Acceptance Criteria (Testable)

- [ ] Rate limiting middleware or library added
- [ ] Login endpoint rate limited (e.g., 5 attempts per minute per IP)
- [ ] User creation endpoint rate limited (e.g., 10 per hour per IP)
- [ ] 429 response returned when limits exceeded
- [ ] `Retry-After` header included in 429 responses
- [ ] Rate limit headers included in responses (optional)
- [ ] Configuration is environment-specific (dev vs prod)
- [ ] Integration tests verify rate limiting behavior
- [ ] All existing tests pass (`dotnet test`)

---

## 4. Constraints

- Use well-maintained, secure libraries if adding dependencies
- Do not break existing functionality
- Rate limits should be configurable via appsettings
- Follow existing middleware patterns
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Recommended Libraries:**
- `AspNetCoreRateLimit` - Popular rate limiting middleware
- Built-in .NET 7+ rate limiting middleware (`Microsoft.AspNetCore.RateLimiting`)

**Implementation Pattern (using .NET built-in):**
```csharp
// In Program.cs
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    
    options.AddFixedWindowLimiter("registration", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromHours(1);
    });
    
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        await context.HttpContext.Response.WriteAsync("Too many requests. Please try again later.");
    };
});

app.UseRateLimiter();

// On controller/endpoint
[EnableRateLimiting("login")]
[HttpPost("login")]
public async Task<ActionResult> Login(...)
```

**Configuration in appsettings.json:**
```json
{
  "RateLimiting": {
    "Login": {
      "PermitLimit": 5,
      "WindowMinutes": 1
    },
    "Registration": {
      "PermitLimit": 10,
      "WindowHours": 1
    }
  }
}
```

**Key Files to Modify:**
- `backend/FanEngagement.Api/Program.cs`
- `backend/FanEngagement.Api/appsettings.json`
- `backend/FanEngagement.Api/Controllers/AuthController.cs` (or similar)
- `backend/FanEngagement.Api/Controllers/UsersController.cs`

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Api/**`
- `backend/FanEngagement.Tests/**`

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test the work (`dotnet build`, `dotnet test`)
- Explanation of rate limiting configuration
- Test demonstrating rate limiting behavior
- Confirmed adherence to architecture patterns
