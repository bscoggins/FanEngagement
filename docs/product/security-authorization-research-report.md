# Security and Authorization Research Report

## Executive Summary

This research report documents the current state of FanEngagement's security and authorization model, identifies critical risks and gaps, and provides recommendations for improvement. The analysis focuses on authentication flows, authorization boundaries, sensitive data handling, and access control enforcement across the application.

**Key Finding:** The FanEngagement application has significant authorization gaps where many endpoints lack proper role-based access control. While the *intended* permission model is well-documented in `docs/architecture.md`, the *actual implementation* falls short, exposing sensitive operations to unauthorized users.

**Recommendation:** Create a dedicated Epic (E-006) to systematically address security and authorization improvements, prioritized by risk severity.

---

## 1. Current Security and Authorization Posture

### 1.1 Authentication Model

**Current Implementation:**

- **JWT-based Authentication**: Users authenticate via JWT tokens containing role claims (`ClaimTypes.Role`)
- **Token Claims**: JWT includes user ID (`ClaimTypes.NameIdentifier`) and global role (`ClaimTypes.Role`)
- **Session Management**: Stateless JWT model; no server-side session storage documented
- **Registration**: Open user creation via `[AllowAnonymous]` on `POST /users`

**References:** `docs/architecture.md` → JWT Claims & Implementation section

**Assessment:**
- ✅ JWT-based auth is industry standard and appropriate
- ⚠️ No documentation of token expiration, refresh mechanism, or revocation
- ⚠️ No multi-factor authentication (MFA) support
- ❌ Password requirements are minimal (8 characters minimum)

### 1.2 Authorization Model (Intended vs. Actual)

**Intended Model (Well-Documented):**

FanEngagement defines a two-tier role model:

1. **Global Roles** (`User.Role` - `UserRole` enum):
   - `User`: Default role for regular platform users
   - `Admin`: Platform-wide administrator with elevated privileges

2. **Organization Roles** (`OrganizationMembership.Role` - `OrganizationRole` enum):
   - `Member`: Regular organization member; can vote, view resources
   - `OrgAdmin`: Organization administrator; can manage org settings, memberships, proposals

**Authorization Policies Defined:**
- `GlobalAdmin`: Requires `UserRole.Admin`
- `OrgMember`: Requires membership in the organization
- `OrgAdmin`: Requires `OrgAdmin` role in the organization
- `ProposalManager`: Allows proposal creator or OrgAdmin to manage proposals

**Actual Implementation (Critical Gaps):**

Per `docs/architecture.md` → "Current Authorization Implementation" table, most endpoints have incomplete or missing authorization:

| Enforcement Level | Count | Description |
|-------------------|-------|-------------|
| ✅ ENFORCED | ~5 | Proper authorization checks in place |
| ⚠️ AUTH-ONLY | ~10 | Only requires authentication, no role checks |
| ⚠️ OPEN | ~25+ | No authorization - anonymous access allowed |

**References:** `docs/architecture.md` → Roles & Permissions section, Implementation Gaps & Security Concerns

### 1.3 Sensitive Data Exposure Assessment

**Data Categories Identified:**

1. **User PII (Personally Identifiable Information):**
   - Email addresses
   - Display names
   - User IDs (exposed in API responses)

2. **Authentication Secrets:**
   - Passwords (hashed, but storage mechanism not fully documented)
   - JWT signing keys (configuration-based)

3. **Organization Data:**
   - Webhook secrets (stored in `WebhookEndpoint.Secret`)
   - Webhook URLs (could reveal internal infrastructure)
   - Governance outcomes (proposals, votes)

4. **Access Logs:**
   - Structured logging captures correlation IDs, request paths, user actions
   - Vote casting logs include `VotingPower` but not user details

**Assessment:**
- ✅ Vote logging avoids user PII (good practice)
- ⚠️ User enumeration possible via `GET /users` (AUTH-ONLY)
- ⚠️ Webhook secrets stored in database (encryption status unclear)
- ❌ Any authenticated user can view/update/delete any user (critical risk)

### 1.4 Access Control Points Analysis

**Key User Journeys and Their Access Control:**

| Journey | Expected Control | Actual Control | Risk Level |
|---------|------------------|----------------|------------|
| User Registration | Open (intentional) | ✅ Open | Low |
| User Profile Management | Self or Admin | ⚠️ Any authenticated | **Critical** |
| Organization Creation | GlobalAdmin only | ⚠️ Open (anonymous) | **High** |
| Organization Management | OrgAdmin | ⚠️ Any authenticated | **High** |
| Membership Management | OrgAdmin | ⚠️ Any authenticated | **High** |
| Share Issuance | OrgAdmin | ⚠️ Open (anonymous) | **Critical** |
| Proposal CRUD | OrgAdmin/Creator | ⚠️ Open (anonymous) | **Critical** |
| Voting | Members with voting power | ⚠️ Open (anonymous) | **Critical** |
| Webhook Management | OrgAdmin | ⚠️ Open (anonymous) | **High** |
| Admin Dev Tools | GlobalAdmin | ✅ Enforced | Low |

---

## 2. Identified Risks, Gaps, and Issues

### 2.1 Critical Security Risks

#### Risk 1: Unauthorized User Data Access and Modification

**Description:** Any authenticated user can list, view, update, and delete ANY user in the system, including changing user roles for privilege escalation.

**Affected Endpoints:**
- `GET /users` - list all users
- `GET /users/{id}` - view any user
- `PUT /users/{id}` - update any user (including role changes)
- `DELETE /users/{id}` - delete any user

**Impact:**
- **User enumeration**: Attackers can harvest email addresses
- **Privilege escalation**: Any user can grant themselves Admin role
- **Account takeover**: Update user credentials or PII
- **Data destruction**: Delete user accounts

**Reference:** `docs/architecture.md` → User Management APIs section

**Severity:** 🔴 **CRITICAL**

---

#### Risk 2: Anonymous Share Issuance and Balance Manipulation

**Description:** Share issuance and balance endpoints have NO authorization, allowing anonymous users to issue shares (voting power) to any account.

**Affected Endpoints:**
- `POST /organizations/{orgId}/share-issuances` - issue shares (anonymous)
- `GET /organizations/{orgId}/share-issuances` - list issuances (anonymous)
- `GET /users/{userId}/share-balances` - view balances (anonymous)

**Impact:**
- **Governance fraud**: Attacker issues shares to controlled accounts
- **Voting manipulation**: Artificially inflate voting power
- **Financial fraud**: If shares have real-world value

**Reference:** `docs/architecture.md` → Share Type, Issuance, Balances section

**Severity:** 🔴 **CRITICAL**

---

#### Risk 3: Anonymous Voting and Proposal Manipulation

**Description:** All proposal and voting endpoints are open to anonymous access, enabling unauthorized voting and governance manipulation.

**Affected Endpoints:**
- `POST /organizations/{orgId}/proposals` - create proposal (anonymous)
- `GET/PUT /proposals/{id}` - view/update proposal (anonymous)
- `POST /proposals/{id}/votes` - cast vote (anonymous)
- `POST /proposals/{id}/open|close|finalize` - lifecycle transitions (anonymous)

**Impact:**
- **Anonymous voting**: Votes cast without verification
- **Proposal hijacking**: Anyone can modify or close proposals
- **Results tampering**: Manipulate governance outcomes
- **Governance denial of service**: Spam proposals or close legitimate ones

**Reference:** `docs/architecture.md` → Proposal & Voting APIs section

**Severity:** 🔴 **CRITICAL**

---

#### Risk 4: Unauthorized Organization and Membership Management

**Description:** Organization creation is open to anonymous users, and membership management is open to any authenticated user.

**Affected Endpoints:**
- `POST /organizations` - create organization (anonymous)
- `PUT /organizations/{id}` - update organization (any authenticated)
- `POST /organizations/{orgId}/memberships` - add members (any authenticated)
- `DELETE /memberships/{id}` - remove members (any authenticated)

**Impact:**
- **Organization squatting**: Create organizations with misleading names
- **Unauthorized access grants**: Add attackers to legitimate organizations
- **Membership manipulation**: Remove legitimate members

**Reference:** `docs/architecture.md` → Organization APIs, Membership APIs sections

**Severity:** 🟠 **HIGH**

---

### 2.2 High Security Risks

#### Risk 5: Webhook Endpoint Exposure

**Description:** All webhook management endpoints are open to anonymous access.

**Affected Endpoints:**
- `POST/GET/PUT/DELETE /organizations/{orgId}/webhooks`
- `GET /organizations/{orgId}/outbound-events`

**Impact:**
- **Webhook hijacking**: Redirect notifications to attacker-controlled endpoints
- **Secret exposure**: View or modify webhook secrets
- **Data exfiltration**: Intercept governance events sent to webhooks

**Reference:** `docs/architecture.md` → Webhook & Event APIs section

**Severity:** 🟠 **HIGH**

---

#### Risk 6: Missing Privilege Escalation Prevention

**Description:** No safeguards prevent OrgAdmins from modifying their own membership role.

**Current State:**
- Role changes require delete/recreate membership (no direct update endpoint)
- No validation prevents self-role modification during creation

**Impact:**
- OrgAdmins could manipulate role assignments

**Reference:** `docs/architecture.md` → Privilege Escalation Prevention section

**Severity:** 🟡 **MEDIUM**

---

### 2.3 Medium Security Risks

#### Risk 7: Insufficient Password Requirements

**Description:** Password validation requires minimum 8 characters only.

**Impact:**
- Weak passwords susceptible to brute force
- No complexity requirements (uppercase, numbers, symbols)

**Reference:** `docs/architecture.md` → Validation Strategy section (`CreateUserRequestValidator`)

**Severity:** 🟡 **MEDIUM**

---

#### Risk 8: Missing Rate Limiting

**Description:** No documentation of rate limiting on authentication or API endpoints.

**Impact:**
- Brute force attacks on login
- API abuse and denial of service
- Share/vote spamming

**Severity:** 🟡 **MEDIUM**

---

#### Risk 9: JWT Token Security Gaps

**Description:** Limited documentation on token expiration, refresh, and revocation.

**Impact:**
- Long-lived tokens increase exposure window
- Compromised tokens cannot be revoked
- No documented refresh token flow

**Severity:** 🟡 **MEDIUM**

---

### 2.4 Low Security Risks / Observations

#### Risk 10: Missing Multi-Factor Authentication

**Description:** No MFA support documented for admin or high-value operations.

**Impact:** Reduced account security for privileged users.

**Severity:** 🟢 **LOW** (enhancement opportunity)

---

#### Risk 11: Audit Logging Coverage

**Description:** While E-005 (Audit Logging Epic) is proposed, comprehensive audit logging is not yet implemented.

**Impact:** Limited forensic capability for security incidents.

**Reference:** `docs/future-improvements.md` → Audit Logging entry, `docs/product/backlog.md` → E-005

**Severity:** 🟢 **LOW** (addressed by existing Epic)

---

## 3. Recommendations and Guiding Principles

### 3.1 Guiding Security Principles

1. **Defense in Depth**: Implement authorization at multiple layers (controller, service, database)
2. **Least Privilege**: Users should only access resources necessary for their role
3. **Fail Secure**: Default to deny; require explicit grants for access
4. **Audit Everything**: Log all security-relevant actions for forensic analysis
5. **Validate at Boundaries**: All external inputs must be validated before processing

### 3.2 Recommended Improvements by Priority

#### Immediate (Now) - Critical Fixes

1. **Implement Policy-Based Authorization for All Endpoints**
   - Create custom authorization handlers for `OrgMember`, `OrgAdmin`, `ResourceOwner`
   - Apply policies to all controllers systematically
   - Test each endpoint with different role combinations

2. **Secure User Management APIs**
   - Restrict user list/view to GlobalAdmins
   - Allow self-update only for own profile
   - Prevent role modification without GlobalAdmin

3. **Secure Share Issuance APIs**
   - Require OrgAdmin role for share operations
   - Add organization membership validation

4. **Secure Proposal and Voting APIs**
   - Require OrgMember for proposal viewing
   - Require voting power for vote casting
   - Require OrgAdmin/Creator for proposal management

#### Short-Term (Next) - High Priority

5. **Secure Organization and Membership APIs**
   - Enforce GlobalAdmin for organization creation
   - Require OrgAdmin for membership management
   - Add privilege escalation prevention

6. **Secure Webhook APIs**
   - Require OrgAdmin for webhook management
   - Encrypt webhook secrets at rest

7. **Add Authorization Integration Tests**
   - Comprehensive test coverage for all endpoints
   - Test positive and negative authorization scenarios
   - Test cross-organization access denial

#### Medium-Term (Later) - Enhancements

8. **Strengthen Password Requirements**
   - Minimum 12 characters
   - Require complexity (uppercase, number, symbol)
   - Implement password breach checking (optional)

9. **Implement Rate Limiting**
   - Login endpoint throttling
   - API rate limits per user/IP
   - Share issuance rate limiting

10. **JWT Security Enhancements**
    - Document and configure appropriate token expiration
    - Implement refresh token flow
    - Consider token revocation mechanism

11. **Add MFA Support**
    - TOTP-based MFA for admin users
    - Optional MFA for all users

### 3.3 Architectural Recommendations

1. **Centralized Authorization Service**
   - Create `IAuthorizationService` with methods for common checks
   - Encapsulate organization role lookups
   - Provide consistent authorization API for services

2. **Authorization Middleware/Filter**
   - Create organization context extraction from routes
   - Automatic organization membership validation for org-scoped routes

3. **Policy-Handler Pattern**
   - Use ASP.NET Core's `IAuthorizationHandler` pattern
   - Create reusable requirement classes
   - Enable composition of multiple requirements

---

## 4. Proposed Epic Outline: E-006 – Security and Authorization Hardening

### 4.1 Epic Goal

**Transform FanEngagement from a development-ready application into a production-ready platform with comprehensive, enforced authorization across all API endpoints and user journeys.**

### 4.2 Epic Scope

**In Scope:**
- All API endpoint authorization enforcement
- User, organization, membership, share, proposal, voting, and webhook access control
- Authorization testing infrastructure
- Documentation updates for security model

**Out of Scope:**
- Audit logging (covered by E-005)
- Blockchain-related security (covered by E-004)
- Frontend permission changes (unless required for API changes)
- Performance optimization

### 4.3 Candidate Stories / Workstreams

#### Workstream A: Authorization Infrastructure (Foundation)

| Story ID | Title | Priority | Description |
|----------|-------|----------|-------------|
| E-006-01 | Create Authorization Service and Handlers | Now | Implement `IAuthorizationService` and custom `IAuthorizationHandler` implementations for OrgMember, OrgAdmin, ResourceOwner patterns |
| E-006-02 | Create Organization Context Middleware | Now | Extract `organizationId` from routes and make available to authorization handlers |
| E-006-03 | Define Authorization Policies | Now | Register all policies (OrgMember, OrgAdmin, ProposalManager, etc.) in DI |

#### Workstream B: Secure Critical APIs (Immediate)

| Story ID | Title | Priority | Description |
|----------|-------|----------|-------------|
| E-006-04 | Harden User Management APIs | Now | Apply GlobalAdmin policy to user list/view; restrict updates to self or Admin |
| E-006-05 | Harden Share Issuance APIs | Now | Require OrgAdmin for share operations; validate organization membership |
| E-006-06 | Harden Proposal APIs | Now | Require OrgMember for viewing; OrgAdmin/Creator for management |
| E-006-07 | Harden Voting APIs | Now | Validate organization membership and voting power before vote casting |

#### Workstream C: Secure High-Priority APIs (Short-Term)

| Story ID | Title | Priority | Description |
|----------|-------|----------|-------------|
| E-006-08 | Harden Organization APIs | Next | Enforce GlobalAdmin for creation; OrgAdmin for updates |
| E-006-09 | Harden Membership APIs | Next | Require OrgAdmin for membership management; prevent self-role modification |
| E-006-10 | Harden Webhook APIs | Next | Require OrgAdmin for webhook management |
| E-006-11 | Harden Share Type APIs | Next | Require OrgAdmin for share type creation/modification |

#### Workstream D: Authorization Testing

| Story ID | Title | Priority | Description |
|----------|-------|----------|-------------|
| E-006-12 | Create Authorization Test Fixtures | Now | Helper methods for creating authenticated clients with different roles |
| E-006-13 | User API Authorization Tests | Now | Test all user endpoints with all role combinations |
| E-006-14 | Organization API Authorization Tests | Next | Test organization endpoints with role combinations |
| E-006-15 | Proposal/Voting Authorization Tests | Next | Test proposal and voting endpoints with role combinations |
| E-006-16 | Comprehensive Authorization Matrix Tests | Next | End-to-end tests validating full authorization matrix |

#### Workstream E: Security Enhancements

| Story ID | Title | Priority | Description |
|----------|-------|----------|-------------|
| E-006-17 | Strengthen Password Requirements | Later | Increase minimum length; add complexity requirements |
| E-006-18 | Implement Rate Limiting | Later | Add rate limiting to auth and sensitive endpoints |
| E-006-19 | Document JWT Security Model | Later | Document token expiration, refresh, revocation approach |
| E-006-20 | Encrypt Webhook Secrets at Rest | Later | Apply encryption to webhook secrets in database |

#### Workstream F: Documentation and Verification

| Story ID | Title | Priority | Description |
|----------|-------|----------|-------------|
| E-006-21 | Update Architecture Documentation | Now | Update `docs/architecture.md` to reflect implemented authorization |
| E-006-22 | Create Security Runbook | Later | Operational procedures for security incidents |
| E-006-23 | Security Review and Penetration Testing | Later | External security audit of implemented controls |

### 4.4 Themes for Acceptance Criteria

Each story should include acceptance criteria covering:

1. **Positive Authorization**: Authorized users can access expected resources
2. **Negative Authorization**: Unauthorized users receive 401/403 responses
3. **Cross-Organization Isolation**: Users cannot access resources in orgs they don't belong to
4. **Self-Access**: Users can access their own resources without special roles
5. **Admin Override**: GlobalAdmins can access all resources
6. **Error Messages**: Clear, non-leaking error responses
7. **Test Coverage**: Unit and integration tests for each authorization scenario

### 4.5 Assumptions

1. The intended authorization model in `docs/architecture.md` is correct and should be implemented
2. Existing frontend permission checks align with backend implementation goals
3. No breaking changes to API contracts (add authorization without changing request/response)
4. Test infrastructure (`WebApplicationFactory`, test helpers) is adequate for authorization testing

### 4.6 Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking existing integrations | High | Medium | Careful rollout; feature flags for auth enforcement |
| Test coverage gaps | Medium | Medium | Comprehensive authorization test matrix |
| Performance impact from auth checks | Low | Low | Efficient DB queries; caching membership lookups |
| Regression in existing functionality | Medium | Medium | Extensive test suite; staged rollout |

### 4.7 Open Questions for Human Review

1. **Rollout Strategy**: Should authorization be enforced gradually (endpoint by endpoint) or all at once?
2. **Grace Period**: Should there be a "warn but allow" period before strict enforcement?
3. **Error Response Format**: Should 403 responses include reason, or be generic for security?
4. **Caching**: Should organization memberships be cached for performance?
5. **Feature Flags**: Should new authorization be behind feature flags for controlled rollout?

### 4.8 Dependencies

- **E-005 (Audit Logging)**: Authorization events should be logged once audit infrastructure exists
- **Frontend Permission Checks**: May need updates to match backend authorization changes

### 4.9 Success Metrics

- 100% of API endpoints have explicit authorization policies
- 0 endpoints with anonymous access to protected resources
- Authorization test coverage for all endpoints
- No privilege escalation paths identified in security review

---

## 5. Summary

This research identifies **critical security gaps** in FanEngagement's current authorization implementation. While the intended model is well-documented, the actual enforcement is largely missing, exposing the application to:

- Privilege escalation
- Unauthorized data access and modification
- Anonymous voting and governance manipulation
- Organization and membership tampering

**Recommended Next Steps:**

1. ✅ Review this report with engineering and security stakeholders
2. ✅ Approve creation of Epic E-006 in `docs/product/backlog.md`
3. ✅ Prioritize Workstream A (Infrastructure) and Workstream B (Critical APIs) for immediate implementation
4. ✅ Schedule security review after implementation

---

## Appendix A: Reference Documentation

- `docs/architecture.md` - Comprehensive security and authorization documentation
- `docs/product/backlog.md` - Product backlog with existing epics
- `docs/future-improvements.md` - Long-term improvement ideas
- `.github/copilot-coding-agent-instructions.md` - Repository patterns and conventions

## Appendix B: Authorization Matrix (Target State)

Reproduced from `docs/architecture.md` for reference:

| Action | Global User | Global Admin | Org Member | Org OrgAdmin |
|--------|-------------|--------------|------------|--------------|
| Create user | ✓ | ✓ | - | - |
| List/view users | - | ✓ | - | - |
| Update user (self) | ✓ | ✓ | - | - |
| Update user (other) | - | ✓ | - | - |
| Delete user | - | ✓ | - | - |
| Create organization | - | ✓ | - | - |
| View organization | (member) | ✓ | ✓ | ✓ |
| Update organization | - | ✓ | - | ✓ |
| Manage memberships | - | ✓ | - | ✓ |
| Manage share types | - | ✓ | - | ✓ |
| Issue shares | - | ✓ | - | ✓ |
| View balances | (self) | ✓ | ✓ (self) | ✓ |
| Create proposal | (member) | ✓ | ✓ | ✓ |
| Manage proposal | (creator) | ✓ | - | ✓ |
| Cast vote | (member) | ✓ | ✓ | ✓ |
| Manage webhooks | - | ✓ | - | ✓ |

