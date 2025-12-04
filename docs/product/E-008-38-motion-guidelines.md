# Story E-008-38: Motion Design Guidelines

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** E – Micro-Interactions & Polish  
**Priority:** Later  
**Status:** Proposed

## User Story

> As a **designer**, I want **motion design guidelines**, so that **animations are consistent and purposeful**.

## Acceptance Criteria

- [ ] Documentation in `/docs/frontend/motion-design.md`
- [ ] Guidelines: when to animate, animation duration, easing curves
- [ ] Easing tokens: `--ease-in`, `--ease-out`, `--ease-in-out`
- [ ] Examples: button hover, modal open, toast slide, page transition
- [ ] Accessibility: Respect `prefers-reduced-motion`

## Implementation Notes

- Easing curves: Use CSS cubic-bezier or named values
- Reference: Material Design motion guidelines

## Files to Change

- `docs/frontend/motion-design.md` (new)
