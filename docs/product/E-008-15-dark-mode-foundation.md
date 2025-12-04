# Story E-008-15: Dark Mode Foundation

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** B – Design System & Tokens  
**Priority:** Later  
**Status:** Proposed

## User Story

> As a **developer**, I want **dark mode foundation (tokens only)**, so that **we can implement dark mode later without refactoring**.

## Acceptance Criteria

- [ ] Color tokens defined for both light and dark themes
- [ ] CSS uses `@media (prefers-color-scheme: dark)` or class toggle
- [ ] Dark mode tokens include: background, surface, text, borders
- [ ] No full dark mode implementation (foundation only)
- [ ] Documentation explains dark mode token structure

## Implementation Notes

- Foundation only; actual dark mode implementation is separate epic
- Example: `--color-background-light`, `--color-background-dark`

## Files to Change

- `frontend/src/index.css` (dark mode tokens)
- `docs/frontend/design-system.md` (documentation)
