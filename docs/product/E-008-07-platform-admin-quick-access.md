# Story E-008-07: Quick Access for Platform Admins

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** A – Navigation Redesign  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **PlatformAdmin**, I want **quick access to frequently used admin tools**, so that **I can perform common tasks efficiently**.

## Acceptance Criteria

- [ ] Platform admin dashboard includes quick action cards (e.g., "Create Organization", "View Audit Log")
- [ ] Global search in header (search users, orgs, proposals)
- [ ] Keyboard shortcut overlay (? key shows shortcuts)
- [ ] Recent items list in dropdown (last 5 viewed orgs or users)

## Implementation Notes

- Enhance `PlatformAdminDashboardPage.tsx`
- Global search: debounced API call, instant results dropdown
- Keyboard shortcuts: Use library like `react-hotkeys-hook`

## Files to Change

- `frontend/src/pages/PlatformAdminDashboardPage.tsx`
- `frontend/src/components/GlobalSearch.tsx` (new)
