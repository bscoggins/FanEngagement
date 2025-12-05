---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-18: Create the OrgAdmin audit log UI"
labels: ["development", "copilot", "audit", "frontend", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Create the OrgAdmin audit log UI page that allows organization administrators to review audit events for their organization. This provides visibility into actions taken within the organization for governance and accountability.

---

## 2. Requirements

- Create a new page accessible to OrgAdmins
- Display audit events in a filterable, paginated table
- Support expanding rows to view event details
- Follow existing frontend patterns and components

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `/admin/organizations/:orgId/audit-log` page
- [ ] Display audit events in a table with columns:
  - Timestamp (formatted, local timezone)
  - Actor (display name, linked to user if applicable)
  - Action (action type with visual indicator)
  - Resource (resource type + name)
  - Outcome (Success/Failure/Denied with color-coded badge)
- [ ] Implement filtering controls:
  - Date range picker (from/to)
  - Action type dropdown (multi-select)
  - Resource type dropdown (multi-select)
  - Search by actor name or resource name
- [ ] Implement pagination:
  - Page size selector (10, 25, 50, 100)
  - Page navigation
  - Total count display
- [ ] Add expandable row for event details:
  - JSON viewer or formatted key-value display
  - Correlation ID
  - IP address (if available)
  - Full failure reason (if applicable)
- [ ] Add loading state with `LoadingSpinner`
- [ ] Add error state with `ErrorMessage` and retry button
- [ ] Add empty state when no audit events match filters
- [ ] Add route guard for OrgAdmin role
- [ ] Add navigation item to org admin sidebar:
  - Label: "Audit Log"
  - Icon: appropriate audit/history icon
  - Position: after Webhook Events
- [ ] Add `data-testid` attributes for E2E testing:
  - `audit-log-heading`
  - `audit-log-table`
  - `audit-log-filter-date`
  - `audit-log-filter-action`
  - `audit-log-filter-resource`
  - `audit-log-pagination`
- [ ] Use existing API client pattern for fetching audit events
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

- Admin pages: `frontend/src/pages/admin/`
- Navigation config: `frontend/src/navigation/navConfig.ts`
- API client: `frontend/src/api/`
- UI components: `frontend/src/components/`

**API Integration:**

```typescript
// frontend/src/api/auditEvents.ts
export const auditEventsApi = {
  getByOrganization: async (
    orgId: string,
    params: AuditQueryParams
  ): Promise<PagedResult<AuditEvent>> => {
    const response = await apiClient.get(
      `/organizations/${orgId}/audit-events`,
      { params }
    );
    return response.data;
  },
};
```

**Page Structure:**

```tsx
const AuditLogPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const [filters, setFilters] = useState<AuditFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data, loading, error, refetch } = useAsync(
    () => auditEventsApi.getByOrganization(orgId!, { ...filters, page, pageSize }),
    [orgId, filters, page, pageSize]
  );

  // ... render
};
```

**Table Row Expansion:**

Consider using a collapsible row pattern or modal for details view.

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-16 (Audit query API)
- Related to: E-005-19 (PlatformAdmin UI)

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
- frontend/src/pages/admin/**
- frontend/src/api/**
- frontend/src/navigation/navConfig.ts
- frontend/src/types/**
- frontend/src/components/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`npm run build`, `npm test`)
- Screenshots of the audit log page showing:
  - Table with audit events
  - Filtering controls
  - Pagination
  - Expanded row details
  - Empty state
- Navigation item visible in org admin sidebar
- All tests pass
