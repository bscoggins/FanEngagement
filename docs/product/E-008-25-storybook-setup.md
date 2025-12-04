# Story E-008-25: Storybook for Components

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** C – Component Library Refresh  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **developer**, I want **Storybook for all updated components**, so that **components are documented and testable in isolation**.

## Acceptance Criteria

- [ ] Storybook installed and configured
- [ ] Stories for all components: Button, Badge, Card, Table, Form, Toast, Modal, Dropdown, Tooltip
- [ ] Stories show all variants, sizes, and states
- [ ] Interactive controls (Storybook Controls addon)
- [ ] Accessibility testing with `@storybook/addon-a11y`
- [ ] Deployed internally or locally runnable

## Implementation Notes

- Use Storybook 7+ with Vite
- Consider: Chromatic for visual regression testing

## Files to Change

- `.storybook/` (config)
- `frontend/src/**/*.stories.tsx` (new story files)
