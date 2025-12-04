# Story E-008-24: Tooltip Component

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** C – Component Library Refresh  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **developer**, I want **Tooltip component**, so that **helpful hints appear on hover or focus**.

## Acceptance Criteria

- [ ] Trigger on hover and keyboard focus
- [ ] Positions: top, bottom, left, right, auto
- [ ] Delay before showing (configurable, default 300ms)
- [ ] Fade-in animation
- [ ] Accessible (ARIA describedby, keyboard dismissable)
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Add tooltips to icons and truncated text across app

## Implementation Notes

- Use `@floating-ui/react` for positioning
- Ensure tooltip doesn't block interactive elements

## Files to Change

- `frontend/src/components/Tooltip.tsx` (new)
- Pages with icons or truncated text
