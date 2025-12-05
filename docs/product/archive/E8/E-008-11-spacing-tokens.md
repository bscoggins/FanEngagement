# Story E-008-11: Spacing Tokens

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** B – Design System & Tokens  
**Priority:** Now  
**Status:** Proposed

## User Story

> As a **developer**, I want **CSS custom properties for spacing**, so that **layouts are consistent and rhythm is predictable**.

## Acceptance Criteria

- [ ] Spacing tokens defined (base unit, scale 0-24)
- [ ] Tokens used for: padding, margin, gap
- [ ] Documentation with spacing scale visualization
- [ ] All magic numbers replaced with spacing tokens

## Implementation Notes

- Example: `--spacing-4` (16px), `--spacing-6` (24px)
- Consider: Use rem units for accessibility
- Apply consistently in components

## Files to Change

- `frontend/src/index.css` (token definitions)
- All component and page CSS files (replace magic numbers)
