# Story E-008-20: Form Components Enhancement

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** C – Component Library Refresh  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **developer**, I want **enhanced Form components (Input, Select, Checkbox, Radio)**, so that **forms are accessible and user-friendly**.

## Acceptance Criteria

- [ ] Input component: text, email, password, number, search
- [ ] States: default, focus, error, disabled
- [ ] Label, helper text, error message slots
- [ ] Icon support (left, right)
- [ ] Select component with custom styling
- [ ] Checkbox and Radio with custom styles
- [ ] Accessible (labels, ARIA, keyboard navigation)
- [ ] Uses design system tokens
- [ ] Storybook stories for all form components
- [ ] Update all forms to use new components

## Implementation Notes

- Use native HTML elements for accessibility
- Custom styling: Overlay pseudo-elements
- Error state: Red border, error icon, message

## Files to Change

- `frontend/src/components/Input.tsx` (new)
- `frontend/src/components/Select.tsx` (new)
- `frontend/src/components/Checkbox.tsx` (new)
- `frontend/src/components/Radio.tsx` (new)
- All form pages
