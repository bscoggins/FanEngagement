# Audit Export Rate Limiting

## Overview

The audit export endpoints have rate limiting enabled to prevent abuse and ensure system stability. Rate limiting is configured per-user to allow fair resource usage.

## Configuration

Rate limiting is configured in `appsettings.json`:

```json
{
  "RateLimiting": {
    "AuditExport": {
      "PermitLimit": 5,
      "WindowHours": 1.0
    }
  }
}
```

### Configuration Options

- **PermitLimit**: Number of export requests allowed per user within the time window (default: 5)
- **WindowHours**: Time window in hours for rate limiting (default: 1.0 hour)

## Behavior

- Each authenticated user has their own rate limit counter
- Rate limiting uses a fixed window algorithm
- When the limit is exceeded, the API returns `429 Too Many Requests`
- The counter resets after the configured time window

## Affected Endpoints

1. `GET /organizations/{orgId}/audit-events/export` - Organization audit export (OrgAdmin or GlobalAdmin)
2. `GET /admin/audit-events/export` - Global audit export (GlobalAdmin only)

## Environment Variables

You can override the rate limiting configuration using environment variables:

```bash
RateLimiting__AuditExport__PermitLimit=10
RateLimiting__AuditExport__WindowHours=2.0
```

## Testing

Rate limiting is enabled in all environments. For testing purposes:

- Each test user gets their own rate limit counter (partitioned by user ID)
- Tests that require more than 5 exports should use different users
- Consider increasing the limit in test environments if needed

## Monitoring

Rate limit violations are logged at the Information level. Monitor your logs for patterns of rate limit hits to adjust the configuration if needed.

## Implementation Details

- Implementation: `Program.cs` - Rate limiter configuration
- Policy Name: `AuditExportPerUser`
- Partition Key: User ID from JWT claims
- Technology: ASP.NET Core Rate Limiting Middleware (built-in)
