# Story E-008-16: Button Component Redesign

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** C – Component Library Refresh  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **developer**, I want **redesigned Button component with variants and states**, so that **buttons are consistent and accessible**.

## Acceptance Criteria

- [ ] Button variants: primary, secondary, outline, ghost, danger
- [ ] Sizes: xs, sm, md, lg, xl
- [ ] States: default, hover, focus, active, disabled, loading
- [ ] Icon support (left, right, icon-only)
- [ ] Accessible (ARIA labels, focus ring, keyboard activation)
- [ ] Uses design system tokens
- [ ] Storybook story with all variants and states
- [ ] Replace all `<button>` elements with new Button component

## Implementation Notes

- Use CSS modules or styled-components
- Loading state: spinner icon + disabled
- Consider: Polymorphic component (renders as `<button>` or `<a>`)

## Files to Change

- `frontend/src/components/Button.tsx` (new or update)
- All pages/components using buttons
