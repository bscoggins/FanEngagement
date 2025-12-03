# Audit Security Controls Documentation

**Version:** 1.0  
**Last Updated:** December 3, 2024  
**Status:** Production Ready

## Overview

This document provides a comprehensive overview of the security controls implemented in the FanEngagement audit logging system. It serves as a quick reference for developers, security reviewers, and operations teams.

---

## Security Controls Summary

### 1. Append-Only Storage

**Control ID:** AUD-SEC-001  
**Control Type:** Technical  
**Severity:** Critical

**Description:** Audit events are immutable once created. No update or delete operations are permitted through any API or service interface.

**Implementation:**
- No PUT, PATCH, or DELETE HTTP endpoints for audit events
- `IAuditService` interface exposes only read and create operations
- Database schema enforces append-only through application logic
- Only retention policy background service can delete old events

**Verification:**
- ✅ Test: `AuditEvents_UpdateEndpoint_DoesNotExist`
- ✅ Test: `AuditEvents_DeleteEndpoint_DoesNotExist`
- ✅ Test: `AuditEvents_PatchEndpoint_DoesNotExist`

**Risk Mitigation:** Prevents audit log tampering and ensures non-repudiation.

---

### 2. Multi-Tenant Authorization

**Control ID:** AUD-SEC-002  
**Control Type:** Technical  
**Severity:** Critical

**Description:** Organization administrators can only access audit events for organizations they administer. Cross-organization access is strictly prohibited.

**Implementation:**
- `[Authorize(Policy = "OrgAdmin")]` attribute on organization audit endpoints
- `OrganizationAdminHandler` validates user has OrgAdmin role for requested organization
- Organization ID extracted from route and validated against user's memberships
- Global Admins bypass organization checks (by design)

**Verification:**
- ✅ Test: `OrgAdmin_CanQuery_OwnOrganization_Events`
- ✅ Test: `OrgAdmin_CannotQuery_OtherOrganization_Events`
- ✅ Test: `OrgAdmin_CannotExport_OtherOrganization_Events`

**Risk Mitigation:** Prevents information disclosure between tenants.

---

### 3. Role-Based Access Control

**Control ID:** AUD-SEC-003  
**Control Type:** Technical  
**Severity:** High

**Description:** Access to audit data is restricted based on user roles: GlobalAdmin (full access), OrgAdmin (organization access), Member (self-access only).

**Implementation:**
- Three authorization policies: `GlobalAdmin`, `OrgAdmin`, `Authorized` (any authenticated user)
- Role checks in authorization handlers
- Separate controller endpoints for different access levels
- User self-query endpoint filters by ActorUserId

**Verification:**
- ✅ Test: `Member_CannotAccess_OrganizationAuditEndpoint`
- ✅ Test: `Member_CanAccess_OwnUserAuditEndpoint`
- ✅ Test: `UserAuditEndpoint_OnlyReturns_OwnEvents`
- ✅ Test: `Member_CannotAccess_AdminAuditEndpoint`

**Risk Mitigation:** Enforces principle of least privilege.

---

### 4. Sensitive Data Exclusion

**Control ID:** AUD-SEC-004  
**Control Type:** Technical  
**Severity:** Critical

**Description:** Sensitive data (passwords, tokens, secrets) is never logged in audit events. Audit logging code is designed to sanitize inputs and prevent credential leakage.

**Implementation:**
- Password hashing before any audit logging
- JWT tokens never included in audit event Details
- Webhook secrets excluded from audit events
- No Bearer token values in audit data
- AuditEventBuilder does not accept raw credentials

**Verification:**
- ✅ Test: `AuditEvents_DoNotContain_Passwords`
- ✅ Test: `AuditEvents_DoNotContain_JwtTokens`
- ✅ Test: `AuditEvents_DoNotContain_SensitiveDataPatterns`

**Risk Mitigation:** Prevents credential exposure in audit logs.

---

### 5. Privacy-Filtered User Access

**Control ID:** AUD-SEC-005  
**Control Type:** Technical  
**Severity:** Medium

**Description:** When users query their own audit events, IP addresses and other sensitive metadata are excluded for privacy.

**Implementation:**
- Separate `AuditEventUserDto` for user self-query
- `ActorIpAddress` field excluded from user DTO
- `ActorUserId` and `ActorDisplayName` excluded (redundant for self-query)
- Minimal information disclosure to users

**Verification:**
- ✅ Test: `UserAuditEvents_DoNotContain_IpAddresses`

**Risk Mitigation:** Supports privacy regulations (GDPR) while maintaining audit transparency.

---

### 6. Meta-Auditing

**Control ID:** AUD-SEC-006  
**Control Type:** Technical  
**Severity:** Medium

**Description:** Access to audit data (especially bulk exports) is itself audited, creating a meta-audit trail.

**Implementation:**
- Export operations generate `AuditActionType.Exported` events
- Export audit events include actor, timestamp, format, and filters
- Both organization-scoped and admin exports are audited
- Query operations are NOT audited (by design for performance)

**Verification:**
- ✅ Test: `AuditExport_GeneratesAuditEvent`
- ✅ Test: `AdminAuditExport_GeneratesAuditEvent`
- ✅ Test: `AuditQuery_GeneratesAuditEvent` (documents query behavior)

**Risk Mitigation:** Enables detection of suspicious audit access patterns.

---

### 7. Rate Limiting

**Control ID:** AUD-SEC-007  
**Control Type:** Technical  
**Severity:** Low

**Description:** Audit export operations are rate-limited to prevent abuse and excessive data extraction.

**Implementation:**
- `[EnableRateLimiting("AuditExportPerUser")]` attribute on export endpoints
- Fixed window rate limiter: 5 exports per hour per user (configurable)
- Rate limit partitioned by user ID
- Returns HTTP 429 (Too Many Requests) when limit exceeded

**Configuration:**
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

**Risk Mitigation:** Prevents bulk data exfiltration attempts.

---

### 8. DTO Layer Security

**Control ID:** AUD-SEC-008  
**Control Type:** Technical  
**Severity:** Medium

**Description:** Three separate DTOs provide defense in depth by exposing only necessary fields for each use case.

**Implementation:**

| DTO | Use Case | Exposed Fields | Security Benefit |
|-----|----------|----------------|------------------|
| `AuditEventDto` | List queries (Admin/OrgAdmin) | Standard fields, IP address | Does NOT include Details field |
| `AuditEventDetailsDto` | Detailed view (not currently used) | All fields including Details | For future investigation endpoint |
| `AuditEventUserDto` | User self-query | Minimal fields, no IP | Privacy-filtered |

**Risk Mitigation:** Limits information disclosure through API design.

---

## Security Testing Strategy

### Test Categories

1. **Append-Only Storage Tests (3 tests)**
   - Verify no modification endpoints exist
   - Confirm proper HTTP status codes

2. **Authorization Tests (4 tests)**
   - Multi-tenant isolation
   - Cross-organization access prevention
   - Role-based access enforcement

3. **Member Access Tests (4 tests)**
   - Member restrictions on org endpoints
   - Member self-query access
   - Admin endpoint restrictions

4. **Sensitive Data Tests (4 tests)**
   - Password exclusion
   - Token exclusion
   - Sensitive pattern detection
   - Privacy filtering

5. **Meta-Auditing Tests (2 tests)**
   - Export auditing
   - Query behavior documentation

### Running Security Tests

```bash
# All security tests
dotnet test --filter "Category=Security"

# With detailed output
dotnet test --filter "Category=Security" --logger "console;verbosity=detailed"

# Count tests
dotnet test --filter "Category=Security" --list-tests
```

**Expected Result:** 17 tests passing, 0 failing

---

## Deployment Security Checklist

### Pre-Deployment

- [ ] All security tests passing
- [ ] Security configuration reviewed
- [ ] JWT signing key is strong and secret
- [ ] Rate limiting configured appropriately
- [ ] Retention policy configured
- [ ] Database backup strategy in place

### Post-Deployment

- [ ] Monitor audit event creation rate
- [ ] Review meta-audit events for suspicious patterns
- [ ] Verify no authorization failures
- [ ] Confirm retention policy is executing
- [ ] Alert on failed audit logging attempts

---

## Incident Response

### Scenario: Unauthorized Audit Access

**Detection:**
- Authorization failures in logs
- Unexpected export patterns in meta-audit events
- User reports of access attempts

**Response:**
1. Query meta-audit events: `GET /admin/audit-events?actionType=Exported`
2. Identify actor: Check `ActorUserId` and `ActorIpAddress`
3. Determine scope: Review export filters in Details field
4. Investigate: Review all actions by suspect user
5. Remediate: Disable user account if necessary

### Scenario: Audit Tampering Attempt

**Detection:**
- 404/405 responses to PUT/DELETE/PATCH requests in logs
- Multiple failed modification attempts

**Response:**
1. Alert security team immediately
2. Review actor information from request logs
3. Check for other suspicious activity by same actor
4. Consider elevated threat level
5. Document incident for compliance

---

## Compliance Mapping

### GDPR

| Requirement | Control | Implementation |
|-------------|---------|----------------|
| Right to Access (Art. 15) | AUD-SEC-003, AUD-SEC-005 | `/users/me/audit-events` endpoint |
| Data Minimization (Art. 5) | AUD-SEC-005, AUD-SEC-008 | Privacy-filtered DTOs |
| Security of Processing (Art. 32) | All controls | Multi-layer security |
| Legitimate Interest (Art. 6) | AUD-SEC-001 | Append-only for security purposes |

### SOC 2

| Control | Mapping | Evidence |
|---------|---------|----------|
| CC6.1 - Logical access | AUD-SEC-002, AUD-SEC-003 | Authorization tests |
| CC6.2 - System operations | AUD-SEC-006 | Meta-auditing tests |
| CC6.3 - Access rights | AUD-SEC-003 | Role-based tests |
| CC7.2 - System monitoring | AUD-SEC-006 | Export audit events |

---

## Maintenance and Review

### Regular Activities

**Daily:**
- Monitor audit event creation rate
- Review authorization failures

**Weekly:**
- Review meta-audit events for exports
- Check rate limiting effectiveness

**Monthly:**
- Security test execution
- Retention policy verification
- Performance review

**Quarterly:**
- Security controls review
- Compliance assessment
- Documentation updates

### Security Review Schedule

| Review Type | Frequency | Next Due |
|-------------|-----------|----------|
| Security Test Execution | Monthly | ___________ |
| Security Controls Review | Quarterly | ___________ |
| Compliance Assessment | Annually | ___________ |
| Penetration Testing | Annually | ___________ |

---

## References

### Documentation

- [Security Verification Report](./security-verification-report.md)
- [Security Review Checklist](./security-review-checklist.md)
- [Audit Architecture](./architecture.md)
- [Operations Guide](./operations.md)

### Code References

- Test Suite: `backend/FanEngagement.Tests/AuditSecurityTests.cs`
- Controllers: `backend/FanEngagement.Api/Controllers/*AuditEventsController.cs`
- Authorization: `backend/FanEngagement.Api/Authorization/OrganizationAdminHandler.cs`
- Service: `backend/FanEngagement.Infrastructure/Services/AuditService.cs`

---

## Contact

**Security Questions:** security@fanengagement.example  
**Compliance Questions:** compliance@fanengagement.example  
**Technical Questions:** engineering@fanengagement.example

---

**Document Control:**
- Version: 1.0
- Last Updated: December 3, 2024
- Next Review: March 3, 2025
- Owner: Security Team
