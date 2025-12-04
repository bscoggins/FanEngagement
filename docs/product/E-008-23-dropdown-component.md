# Story E-008-23: Dropdown Component

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** C – Component Library Refresh  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **developer**, I want **Dropdown component**, so that **menus and popovers are consistent and accessible**.

## Acceptance Criteria

- [ ] Trigger: button or custom trigger element
- [ ] Dropdown content: menu items, custom content
- [ ] Positions: bottom-left, bottom-right, top-left, top-right, auto
- [ ] Keyboard navigation (arrow keys, Enter, Escape)
- [ ] Accessible (ARIA menu, focus management)
- [ ] Animation: Fade + scale-in
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Update org switcher and user menu to use new Dropdown

## Implementation Notes

- Use `@floating-ui/react` for positioning
- Menu items: Support icons, dividers, disabled states

## Files to Change

- `frontend/src/components/Dropdown.tsx` (new)
- `frontend/src/components/OrganizationSelector.tsx` (update)
