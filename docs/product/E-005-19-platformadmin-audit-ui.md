---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-19: Create the PlatformAdmin audit log UI"
labels: ["development", "copilot", "audit", "frontend", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Create the PlatformAdmin audit log UI page that allows global administrators to review audit events across all organizations for platform-wide security monitoring and compliance.

---

## 2. Requirements

- Create a new page accessible to PlatformAdmins
- Support cross-organization audit queries
- Include organization filter/selector
- Provide export functionality
- Follow existing frontend patterns

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `/platform-admin/audit-log` page
- [ ] Include organization filter/selector:
  - Dropdown or searchable select for organization
  - Option to view all organizations
- [ ] Display audit events with organization context:
  - Organization name column
  - Same columns as OrgAdmin view (Timestamp, Actor, Action, Resource, Outcome)
- [ ] Implement same filtering and pagination as OrgAdmin view:
  - Date range picker
  - Action type dropdown
  - Resource type dropdown
  - Actor search
- [ ] Add export button:
  - Triggers export endpoint (CSV/JSON)
  - Shows progress/loading during export
- [ ] Add route guard for PlatformAdmin role
- [ ] Add navigation item to platform admin sidebar:
  - Label: "Audit Log"
  - Icon: appropriate audit/history icon
- [ ] Add `data-testid` attributes for E2E testing
- [ ] Consider performance for cross-org queries (loading indicators, pagination)
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing frontend patterns (React 19 + TypeScript + Vite)
- Use existing UI components (LoadingSpinner, ErrorMessage, EmptyState, Pagination)
- Use existing navigation configuration patterns
- No new dependencies without explicit approval

---

## 5. Technical Notes (Optional)

**Existing Patterns:**

- Platform admin pages: `frontend/src/pages/platform-admin/`
- Navigation config: `frontend/src/navigation/navConfig.ts`
- API client: `frontend/src/api/`
- UI components: `frontend/src/components/`

**API Integration:**

```typescript
// frontend/src/api/auditEvents.ts
export const auditEventsApi = {
  getAll: async (params: AdminAuditQueryParams): Promise<PagedResult<AuditEvent>> => {
    const response = await apiClient.get('/admin/audit-events', { params });
    return response.data;
  },
  exportAll: async (params: AdminAuditExportParams): Promise<Blob> => {
    const response = await apiClient.get('/admin/audit-events/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }
};
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-16 (Query APIs)
- Related to: E-005-18 (OrgAdmin UI), E-005-17 (Export)

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
- frontend/src/pages/platform-admin/**
- frontend/src/api/**
- frontend/src/navigation/navConfig.ts
- frontend/src/types/**
- frontend/src/components/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`npm run build`, `npm test`)
- Screenshots of the platform admin audit log page showing:
  - Organization selector
  - Cross-org audit events
  - Export button
  - Filtering and pagination
- Navigation item visible in platform admin sidebar
- All tests pass
