# Story E-008-12: Shadow and Radius Tokens

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** B – Design System & Tokens  
**Priority:** Now  
**Status:** Proposed

## User Story

> As a **developer**, I want **CSS custom properties for shadows and radii**, so that **elevation and roundness are consistent**.

## Acceptance Criteria

- [ ] Shadow tokens for elevation levels (xs, sm, md, lg, xl, 2xl)
- [ ] Border radius tokens (none, sm, md, lg, xl, full)
- [ ] Documentation with visual examples
- [ ] All hardcoded shadows and radii replaced with tokens

## Implementation Notes

- Example: `--shadow-lg`, `--radius-md`
- Shadows: Use multiple layers for realistic depth
- Consider: Tailwind or Material Design shadow scales

## Files to Change

- `frontend/src/index.css` (token definitions)
- All component CSS files
