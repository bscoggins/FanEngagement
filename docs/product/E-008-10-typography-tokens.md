# Story E-008-10: Typography Tokens

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** B – Design System & Tokens  
**Priority:** Now  
**Status:** Proposed

## User Story

> As a **developer**, I want **CSS custom properties for typography**, so that **text styles are consistent and scalable**.

## Acceptance Criteria

- [ ] Typography tokens defined for font families, sizes, weights, line heights, letter spacing
- [ ] Heading styles (h1-h6) use tokens
- [ ] Body text, labels, captions use tokens
- [ ] Documentation with type scale examples
- [ ] All hardcoded font sizes/weights replaced with tokens

## Implementation Notes

- Example: `--font-size-lg`, `--font-weight-semibold`, `--line-height-normal`
- Consider: Type scale based on modular scale (1.25 or 1.33 ratio)
- Test: Ensure readability across breakpoints

## Files to Change

- `frontend/src/index.css` (token definitions)
- All component and page CSS files (replace hardcoded values)
