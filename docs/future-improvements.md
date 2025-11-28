# Future Improvements

This document is the single place to capture ideas that should not be prioritized in the current workstream but are worth exploring later. Each idea should be concise, actionable, and linked to any relevant issues, PRs, or documentation.

## How to Add an Idea

1. Add a new subsection under **Ideas Backlog** using the format `### <Idea Title>`.
2. Provide a short description (2-4 sentences) summarizing the problem/opportunity and the desired outcome.
3. List any relevant context (links to issues, metrics, user feedback) as bullet points.
4. When an idea is addressed, replace its entry with a note referencing the implemented change (e.g., PR number) or remove it if no longer applicable.

## Ideas Backlog

### Implement Thorough Audit Logging Across the Application

Implement comprehensive audit logging to provide clear traceability for all significant actions taken within the system. This epic covers architecture updates, dedicated audit event storage, user-facing interfaces for reviewing audit trails, and robust testing strategies to ensure reliability and coverage.

- **Epic:** E-005 in `docs/product/E-005-audit-logging.md`
- **Theme:** T3 – Governance Transparency & Trust
- **Key Deliverables:**
  - Audit event data model and storage schema
  - Backend audit service capturing user, authentication, authorization, organization, membership, share, proposal, vote, webhook, and admin actions
  - REST APIs for querying and exporting audit events
  - OrgAdmin and PlatformAdmin audit log UIs
  - Comprehensive documentation and operational runbooks
  - Unit, integration, performance, and security tests
- **Priority:** Next
- **Status:** Proposed (pending human review)

### Reinstate Proposal "Type" Documentation

Clarify whether proposals should expose/display a Type column throughout documentation and UI. If the domain adds support for typed proposals, revisit documentation (e.g., `docs/demo-seed-data.md`) and UI tables to show the new field consistently. If not, capture the decision so reviewers know why the column stays removed.

- Triggered by reviewer feedback on removing the Type column from proposal tables.
- Confirm whether the Proposal entity will gain a Type field or if documentation needs a permanent explanation.

### Security Documentation Update and Enhancements (Epic E-006)

Update outdated security documentation to accurately reflect the current secure implementation, verify authorization test coverage, and implement optional security enhancements for production readiness.

**Key Finding:** Authorization is already comprehensively implemented in the codebase. The `docs/architecture.md` documentation is outdated and incorrectly describes authorization as having "significant gaps."

- **Epic:** E-006 in `docs/product/backlog.md`
- **Research Report:** `docs/product/security-authorization-research-report.md`
- **Theme:** T3 – Governance Transparency & Trust (Security)
- **Key Deliverables:**
  - Updated architecture documentation reflecting secure implementation
  - Verification of authorization test coverage
  - Optional security enhancements (password policy, rate limiting, etc.)
- **Priority:** Now (Documentation); Later (Enhancements)
- **Status:** Proposed (pending human review)
- **Note:** Authorization infrastructure and endpoint policies are already implemented

### Multi-Factor Authentication (MFA) Support

Add optional MFA support for platform administrators and organization admins to strengthen account security for privileged users. Consider TOTP-based authentication (Google Authenticator, Authy) as the initial implementation.

- Related to security hardening efforts (E-006)
- Consider making MFA mandatory for GlobalAdmin role
- **Priority:** Later
- **Status:** Idea (long-tail enhancement)

### Rate Limiting Implementation

Implement rate limiting on authentication endpoints and sensitive API operations to prevent brute force attacks, API abuse, and denial of service scenarios.

- Target endpoints: login, user creation, share issuance, voting
- Consider per-user and per-IP rate limits
- Related to security hardening efforts (E-006)
- **Priority:** Later
- **Status:** Idea (long-tail enhancement)

### JWT Security Enhancements

Document and implement comprehensive JWT security practices including token expiration policies, refresh token flow, and token revocation mechanism for compromised sessions.

- Current state: Token expiration and refresh not fully documented
- Consider short-lived access tokens with refresh tokens
- Add token revocation for security incidents
- Related to security hardening efforts (E-006)
- **Priority:** Later
- **Status:** Idea (long-tail enhancement)

### Webhook Secret Encryption at Rest

Encrypt webhook secrets stored in the database to protect against database-level breaches. Currently, webhook secrets are stored in plaintext.

- Use application-level encryption with secure key management
- Related to security hardening efforts (E-006)
- **Priority:** Later
- **Status:** Idea (long-tail enhancement)

### Password Policy Strengthening

Enhance password requirements beyond the current 8-character minimum to include complexity requirements (uppercase, numbers, symbols) and optionally integrate with breach detection services (Have I Been Pwned).

- Current minimum: 8 characters with no complexity
- Recommended: 12+ characters with complexity requirements
- Related to security hardening efforts (E-006)
- **Priority:** Later
- **Status:** Idea (long-tail enhancement)
