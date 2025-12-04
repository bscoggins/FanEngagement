# Story E-008-37: Optimistic UI Updates

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** E – Micro-Interactions & Polish  
**Priority:** Later  
**Status:** Proposed

## User Story

> As a **user**, I want **optimistic UI updates for async actions**, so that **the app feels instant and responsive**.

## Acceptance Criteria

- [ ] Actions like voting, saving, deleting show immediate UI update
- [ ] If action fails, revert UI and show error toast
- [ ] Loading indicator (spinner or progress bar) for longer actions
- [ ] Tested with slow network conditions (throttling)

## Implementation Notes

- Use React state to update UI immediately, then confirm with API
- Example: Vote cast → option count increments → API call → success or revert

## Files to Change

- Pages with voting, saving, or deleting actions
