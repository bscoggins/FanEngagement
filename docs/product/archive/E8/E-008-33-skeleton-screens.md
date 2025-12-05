# Story E-008-33: Skeleton Loading Screens

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** E – Micro-Interactions & Polish  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **user**, I want **skeleton screens for loading states**, so that **the page feels responsive while data loads**.

## Acceptance Criteria

- [ ] Skeleton component with animated gradient (pulse or shimmer)
- [ ] Skeleton shapes: text lines, circles, rectangles
- [ ] Applied to all async data loading (tables, cards, lists)
- [ ] Uses design system tokens
- [ ] Storybook story with examples

## Implementation Notes

- CSS animation: `@keyframes` with `background-position` shift
- Replace `LoadingSpinner` in some contexts

## Files to Change

- `frontend/src/components/Skeleton.tsx` (new)
- Pages with data loading
