# Story E-008-30: Mobile Screen Reader Support

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** D – Accessibility Remediation  
**Priority:** Now  
**Status:** Proposed

## User Story

> As a **mobile screen reader user**, I want **accessible mobile navigation**, so that **I can navigate the app on my phone with VoiceOver or TalkBack**.

## Acceptance Criteria

- [ ] Hamburger menu button has accessible label
- [ ] Mobile nav drawer has `role="navigation"` and `aria-label`
- [ ] Nav items have accessible names
- [ ] Opening/closing nav announces state change
- [ ] Focus management: Focus moves to first nav item when opened
- [ ] Tested with VoiceOver (iOS) and TalkBack (Android)

## Implementation Notes

- Use `aria-expanded` on hamburger button
- Focus trap in mobile nav drawer

## Files to Change

- Mobile navigation components
