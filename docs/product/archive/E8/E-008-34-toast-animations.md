# Story E-008-34: Toast Animations

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** E – Micro-Interactions & Polish  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **user**, I want **success and error toasts with icons and animations**, so that **I receive clear feedback for my actions**.

## Acceptance Criteria

- [ ] Toast variants: success (✓), warning (⚠), error (✗), info (i)
- [ ] Slide-in animation from edge
- [ ] Auto-dismiss after 5 seconds (configurable)
- [ ] Progress bar showing time until dismiss
- [ ] Toast stacks without overlapping
- [ ] Uses design system tokens

## Implementation Notes

- Build on Story E-008-21 (Toast component)
- Animation: CSS `transform: translateX()`

## Files to Change

- `frontend/src/components/Toast.tsx`
