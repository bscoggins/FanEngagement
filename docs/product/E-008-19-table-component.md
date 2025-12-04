# Story E-008-19: Table Component Enhancement

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** C – Component Library Refresh  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **developer**, I want **enhanced Table component with responsive layout**, so that **data tables work well on all screen sizes**.

## Acceptance Criteria

- [ ] Desktop: Standard table with sticky header
- [ ] Mobile: Horizontal scroll OR card layout (configurable)
- [ ] Sortable columns (optional, icon indicates sort direction)
- [ ] Row hover state with subtle background change
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Update admin pages (users, orgs, proposals) to use new Table

## Implementation Notes

- Responsive: Use `overflow-x: auto` for horizontal scroll
- Card layout: Transform rows into stacked cards on mobile
- Consider: `react-table` or `@tanstack/table`

## Files to Change

- `frontend/src/components/Table.tsx` (new)
- Admin pages with tables
