# Story E-008-36: Page Transition Animations

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** E – Micro-Interactions & Polish  
**Priority:** Later  
**Status:** Proposed

## User Story

> As a **user**, I want **page transition animations**, so that **navigation feels smooth and intentional**.

## Acceptance Criteria

- [ ] Fade-in or slide-in animation when navigating between pages
- [ ] Duration: 200-300ms
- [ ] Respects `prefers-reduced-motion` media query
- [ ] No layout shift during animation
- [ ] Tested across browsers

## Implementation Notes

- Use React Router v6 transitions or Framer Motion
- CSS: `@media (prefers-reduced-motion: reduce)` disables animations

## Files to Change

- `frontend/src/App.tsx` (routing)
- Route components
