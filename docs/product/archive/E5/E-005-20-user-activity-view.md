---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-005-20: Create user action history view"
labels: ["development", "copilot", "audit", "frontend", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Create a user action history view that allows members to see their own actions across the platform, including votes cast, profile changes, and membership changes.

---

## 2. Requirements

- Create a member-accessible page showing their own audit events
- Privacy-focused: only show user's own actions
- Simple list or timeline view
- Date filtering capability

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `/me/activity` page
- [ ] Display current user's audit events:
  - Recent votes cast (proposal, option, timestamp)
  - Profile changes (what changed, when)
  - Membership changes (joined/left organizations, role changes)
- [ ] Implement date filtering:
  - Date range picker or quick filters (last 7 days, last 30 days, etc.)
- [ ] Simple list or timeline view:
  - Chronological ordering (newest first)
  - Clear action descriptions
  - Expandable details where applicable
- [ ] Add loading, error, and empty states
- [ ] Add to member navigation:
  - Label: "My Activity" or "Activity History"
  - Appropriate icon
- [ ] Add `data-testid` attributes for E2E testing
- [ ] Privacy: only show user's own actions (enforced by API)
- [ ] All existing tests continue to pass

---

## 4. Constraints

- Follow existing frontend patterns (React 19 + TypeScript + Vite)
- Use existing UI components
- Privacy-focused: no access to other users' actions
- No new dependencies without explicit approval

---

## 5. Technical Notes (Optional)

**Existing Patterns:**

- Member pages: `frontend/src/pages/me/`
- Navigation config: `frontend/src/navigation/navConfig.ts`
- API client: `frontend/src/api/`

**API Integration:**

```typescript
// Uses the /users/me/audit-events endpoint
export const auditEventsApi = {
  getMyActivity: async (params: MyActivityParams): Promise<PagedResult<AuditEvent>> => {
    const response = await apiClient.get('/users/me/audit-events', { params });
    return response.data;
  }
};
```

**Activity Item Display:**

```tsx
const ActivityItem = ({ event }: { event: AuditEvent }) => (
  <div className="activity-item">
    <span className="activity-icon">{getIconForAction(event.actionType)}</span>
    <div className="activity-content">
      <p className="activity-description">{formatActivityDescription(event)}</p>
      <span className="activity-time">{formatRelativeTime(event.timestamp)}</span>
    </div>
  </div>
);
```

**Related Stories:**

- Part of Epic E-005: Implement Thorough Audit Logging
- Depends on: E-005-16 (Query APIs - /users/me/audit-events endpoint)

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
- frontend/src/pages/me/**
- frontend/src/api/**
- frontend/src/navigation/navConfig.ts
- frontend/src/types/**
- frontend/src/components/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`npm run build`, `npm test`)
- Screenshots of the activity page showing:
  - Activity list/timeline
  - Date filtering
  - Different activity types
  - Empty state
- Navigation item visible in member sidebar
- All tests pass
