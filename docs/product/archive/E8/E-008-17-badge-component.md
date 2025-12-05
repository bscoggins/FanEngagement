# Story E-008-17: Badge Component Redesign

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** C – Component Library Refresh  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **developer**, I want **redesigned Badge component**, so that **status indicators are clear and consistent**.

## Acceptance Criteria

- [ ] Badge variants: default, success, warning, error, info, neutral
- [ ] Sizes: sm, md, lg
- [ ] Shapes: rounded, pill
- [ ] Icon support (optional icon inside badge)
- [ ] Uses design system tokens
- [ ] Storybook story with all variants
- [ ] Update `ProposalStatusBadge.tsx` to use new Badge

## Implementation Notes

- Consider: Dot indicator for compact status display

## Files to Change

- `frontend/src/components/Badge.tsx` (new)
- `frontend/src/components/ProposalStatusBadge.tsx` (update)
