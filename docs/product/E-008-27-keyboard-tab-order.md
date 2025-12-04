# Story E-008-27: Keyboard Navigation and Tab Order

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** D – Accessibility Remediation  
**Priority:** Now  
**Status:** Proposed

## User Story

> As a **keyboard-only user**, I want **logical tab order and no keyboard traps**, so that **I can navigate the entire app efficiently**.

## Acceptance Criteria

- [ ] Tab order follows visual order (top-to-bottom, left-to-right)
- [ ] No keyboard traps (user can always escape)
- [ ] Skip link to main content at top of page
- [ ] Focus visible on all interactive elements
- [ ] Modals trap focus correctly
- [ ] Dropdowns close on Escape
- [ ] Tested by navigating entire app with keyboard only

## Implementation Notes

- Use `tabindex="0"` for custom interactive elements
- Never use `tabindex > 0`
- Test: Unplug mouse and complete key workflows

## Files to Change

- All component files
- Modal and dropdown components
