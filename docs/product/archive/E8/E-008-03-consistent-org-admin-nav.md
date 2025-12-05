# Story E-008-03: Consistent Org Admin Sub-Navigation

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** A – Navigation Redesign  
**Priority:** Now  
**Status:** Proposed

## User Story

> As an **OrgAdmin**, I want **consistent navigation across all org admin pages**, so that **I can easily move between admin tools without losing context**.

## Acceptance Criteria

- [ ] Org admin sub-nav appears consistently in sidebar on all org-scoped pages
- [ ] Sub-nav items: Overview, Memberships, Share Types, Proposals, Webhook Events, Audit Log
- [ ] Active sub-nav item is visually distinct
- [ ] Sub-nav collapses on mobile (accordion or hamburger)
- [ ] Keyboard shortcuts documented (optional: Ctrl+1 for Overview, Ctrl+2 for Memberships, etc.)

## Implementation Notes

- Leverage existing `navConfig.ts` with scope: 'org'
- Ensure `AdminLayout.tsx` renders sub-nav for all org-scoped routes
- Add skip link to main content

## Files to Change

- `frontend/src/components/AdminLayout.tsx`
- `frontend/src/navigation/navConfig.ts`
