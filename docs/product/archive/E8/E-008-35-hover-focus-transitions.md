# Story E-008-35: Hover and Focus Transitions

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** E – Micro-Interactions & Polish  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **user**, I want **smooth hover and focus transitions on interactive elements**, so that **the app feels polished and responsive**.

## Acceptance Criteria

- [ ] All buttons, links, cards have hover state with transition
- [ ] Transition duration: 150-200ms (fast but noticeable)
- [ ] Transition properties: background-color, border-color, box-shadow, transform
- [ ] Focus ring appears instantly (no transition)
- [ ] Uses design system tokens
- [ ] No janky or sluggish animations

## Implementation Notes

- CSS: `transition: background-color 150ms ease, box-shadow 150ms ease;`
- Avoid transitioning layout properties for performance

## Files to Change

- All component CSS files
