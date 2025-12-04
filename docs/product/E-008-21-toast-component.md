# Story E-008-21: Toast Notification Component

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** C – Component Library Refresh  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **developer**, I want **Toast notification component**, so that **users receive non-blocking feedback for actions**.

## Acceptance Criteria

- [ ] Toast variants: success, warning, error, info
- [ ] Positions: top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
- [ ] Auto-dismiss with configurable timeout
- [ ] Manual dismiss (close button)
- [ ] Slide-in animation
- [ ] Stacks multiple toasts vertically
- [ ] Accessible (ARIA live region, focus management)
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Replace/integrate with existing `NotificationContainer.tsx`

## Implementation Notes

- Use context API or library like `react-hot-toast` or `sonner`
- Animation: CSS transform + opacity transition

## Files to Change

- `frontend/src/components/Toast.tsx` (new)
- `frontend/src/contexts/ToastContext.tsx` (new)
- `frontend/src/components/NotificationContainer.tsx` (update or replace)
