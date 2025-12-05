# Story E-008-41: Responsive Tables

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** F – Responsive Design  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **mobile user**, I want **responsive tables that don't overflow**, so that **I can view data on small screens**.

## Acceptance Criteria

- [ ] Tables use horizontal scroll on mobile (with scroll indicator)
- [ ] OR: Tables transform to card layout on mobile (stacked)
- [ ] Sticky header (optional, for long tables)
- [ ] Tested on mobile devices

## Implementation Notes

- Horizontal scroll: `overflow-x: auto; -webkit-overflow-scrolling: touch;`
- Card layout: Hide `<table>` on mobile, render as cards
- Consider: `react-table` responsive plugin

## Files to Change

- Table component
- Admin pages with tables
