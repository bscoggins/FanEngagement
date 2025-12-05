# Story E-008-06: Mobile-Friendly Navigation

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** A – Navigation Redesign  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **member**, I want **mobile-friendly navigation**, so that **I can access all features comfortably on my phone**.

## Acceptance Criteria

- [ ] Hamburger menu icon on mobile (< 768px breakpoint)
- [ ] Tapping hamburger opens full-screen or slide-out nav drawer
- [ ] Nav items have 44px minimum tap target size
- [ ] Closing nav (tap outside, Escape key, or close button) works smoothly
- [ ] Org switcher accessible from mobile nav
- [ ] Active route highlighted in mobile nav

## Implementation Notes

- Update `Layout.tsx` and `AdminLayout.tsx` with mobile nav component
- Consider: Bottom tab bar as alternative navigation pattern
- Test on real devices (iOS Safari, Chrome Android)

## Files to Change

- `frontend/src/components/Layout.tsx`
- `frontend/src/components/AdminLayout.tsx`
- `frontend/src/components/MobileNav.tsx` (new)
