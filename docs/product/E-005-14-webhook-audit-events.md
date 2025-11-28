---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-14: Capture audit events for webhook management"
labels: ["development", "copilot", "audit", "backend", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Capture audit events for webhook management actions to track integration changes. This is security-sensitive as webhooks can expose data to external systems.

---

## 2. Requirements

- Audit webhook CRUD operations
- Audit manual retry triggers
- Include endpoint information without exposing secrets
- Track subscribed event changes

---

## 3. Acceptance Criteria (Testable)

- [ ] Audit: Webhook endpoint created
  - Details: endpoint URL (partial/masked), subscribed events, creator
- [ ] Audit: Webhook endpoint updated
  - Details: changed fields, who updated
- [ ] Audit: Webhook endpoint deleted
  - Details: endpoint URL (partial), who deleted, reason if provided
- [ ] Audit: Outbound event retry triggered
  - Details: event ID, event type, who triggered retry
- [ ] Include relevant context:
  - Actor (who made the change)
  - Organization context
  - Endpoint URL (partial, for security - e.g., first 30 chars + "...")
  - Subscribed events list
- [ ] Do NOT log webhook secrets or full authentication details
- [ ] Integration tests for each webhook audit event type
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing backend layering
- Use the `IAuditService` from E-005-05
- NEVER log webhook secrets
- Mask/truncate URLs to prevent full endpoint exposure
- Audit failures must not fail webhook operations

---

## 5. Technical Notes (Optional)

**Existing Code:**

- `backend/FanEngagement.Infrastructure/Services/WebhookService.cs`
- `backend/FanEngagement.Api/Controllers/WebhookEndpointsController.cs`
- `backend/FanEngagement.Api/Controllers/OutboundEventsController.cs`

**URL Masking Example:**

```csharp
private string MaskUrl(string url)
{
    if (url.Length <= 30) return url;
    return url.Substring(0, 30) + "...";
}
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-05 (Audit service)
- Security-sensitive: Do not expose webhook secrets

---

## 6. Desired Agent

Select one:

- [x] **Default Coding Agent**
- [ ] **docs-agent** (documentation only)
- [ ] **test-agent** (tests only)
- [ ] **lint-agent** (formatting / safe refactor only)
- [ ] **product-owner-agent** (idea → epic/story refinement; no code)

---

## 7. Files Allowed to Change

Allowed:
- backend/FanEngagement.Infrastructure/Services/WebhookService.cs
- backend/FanEngagement.Api/Controllers/WebhookEndpointsController.cs
- backend/FanEngagement.Api/Controllers/OutboundEventsController.cs
- backend/FanEngagement.Tests/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Integration tests for each webhook audit event type
- Confirmation that secrets are never logged
- All tests pass
