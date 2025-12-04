# Story E-008-22: Modal Component

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** C – Component Library Refresh  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **developer**, I want **Modal component**, so that **dialogs and confirmations are consistent and accessible**.

## Acceptance Criteria

- [ ] Modal sizes: sm, md, lg, xl, full
- [ ] Header, body, footer slots
- [ ] Close on backdrop click (configurable)
- [ ] Close on Escape key
- [ ] Focus trap (tab cycles within modal)
- [ ] Accessible (ARIA dialog, focus management, body scroll lock)
- [ ] Slide-in or fade-in animation
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Update confirmation dialogs to use new Modal

## Implementation Notes

- Use `react-modal` or build with `focus-trap-react`
- Body scroll lock: Prevent background scrolling

## Files to Change

- `frontend/src/components/Modal.tsx` (new)
- All pages with dialogs/modals
