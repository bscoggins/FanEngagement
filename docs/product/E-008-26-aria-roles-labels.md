# Story E-008-26: ARIA Roles and Labels

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** D – Accessibility Remediation  
**Priority:** Now  
**Status:** Proposed

## User Story

> As a **screen reader user**, I want **proper ARIA roles, labels, and live regions**, so that **I can understand and operate the app with assistive technology**.

## Acceptance Criteria

- [ ] All interactive elements have ARIA labels or accessible names
- [ ] Landmark roles: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`
- [ ] Buttons without text have `aria-label`
- [ ] Form inputs have associated `<label>` elements or `aria-labelledby`
- [ ] Dynamic content updates use ARIA live regions
- [ ] Complex widgets have correct ARIA attributes
- [ ] Tested with screen reader (NVDA, JAWS, or VoiceOver)

## Implementation Notes

- Audit all pages with axe DevTools
- Use semantic HTML where possible
- Live regions: Use for toasts, loading states, error messages

## Files to Change

- All component and page files
