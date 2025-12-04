# Story E-008-18: Card Component Redesign

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** C – Component Library Refresh  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **developer**, I want **redesigned Card component with elevation and hover states**, so that **cards feel interactive and polished**.

## Acceptance Criteria

- [ ] Card variants: default, interactive (hover effect), bordered
- [ ] Elevation levels using shadow tokens
- [ ] Hover state: subtle scale or shadow increase
- [ ] Padding options: compact, default, spacious
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Update pages to use new Card component

## Implementation Notes

- Interactive cards: use `<button>` or `<a>` wrapper for semantics
- Hover animation: CSS transform with transition

## Files to Change

- `frontend/src/components/Card.tsx` (new)
- All pages using card-like layouts
