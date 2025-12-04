# Story E-008-29: Accessible Forms

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** D – Accessibility Remediation  
**Priority:** Now  
**Status:** Proposed

## User Story

> As a **user**, I want **accessible forms with clear error messages**, so that **I understand what went wrong and how to fix it**.

## Acceptance Criteria

- [ ] All form inputs have associated labels
- [ ] Required fields indicated with asterisk and `aria-required="true"`
- [ ] Error messages use `aria-invalid="true"` and `aria-describedby`
- [ ] Error messages are specific (not just "Invalid input")
- [ ] Error summary at top of form lists all errors
- [ ] Focus moves to first error field on submit
- [ ] Tested with screen reader

## Implementation Notes

- Use form validation library with accessibility support
- Error summary: Use ARIA live region

## Files to Change

- All form components and pages
