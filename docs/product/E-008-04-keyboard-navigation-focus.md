# Story E-008-04: Keyboard Navigation with Visible Focus

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** A – Navigation Redesign  
**Priority:** Now  
**Status:** Proposed

## User Story

> As a **keyboard-only user**, I want **visible focus indicators and logical tab order**, so that **I can navigate the app efficiently without a mouse**.

## Acceptance Criteria

- [ ] All interactive elements (links, buttons, inputs) have visible focus ring (2px solid, high contrast color)
- [ ] Focus ring uses design system token (e.g., `--focus-ring-color`)
- [ ] Tab order follows logical reading order (top to bottom, left to right)
- [ ] Skip link to main content appears on Tab press
- [ ] Modal dialogs trap focus (Tab cycles within modal)
- [ ] Dropdown menus navigable with arrow keys

## Implementation Notes

- Add global CSS for `:focus-visible` with design token
- Test with keyboard only (no mouse)
- Use `focus-trap-react` or similar for modals

## Files to Change

- `frontend/src/index.css` (global focus ring styles)
- All modal and dropdown components
