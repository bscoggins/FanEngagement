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
