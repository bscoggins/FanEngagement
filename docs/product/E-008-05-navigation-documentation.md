# Story E-008-05: Navigation Configuration Documentation

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** A – Navigation Redesign  
**Priority:** Now  
**Status:** Proposed

## User Story

> As a **developer**, I want **comprehensive navigation configuration documentation**, so that **I can add new pages and nav items confidently**.

## Acceptance Criteria

- [ ] Documentation in `/docs/frontend/navigation.md` or README
- [ ] Explains `navConfig.ts` structure (NavItem, scope, roles, order)
- [ ] Provides examples for adding global, org, and user-scoped items
- [ ] Documents route guards (AdminRoute, OrgAdminRoute, ProtectedRoute)
- [ ] Includes troubleshooting section (common issues and fixes)

## Implementation Notes

- Leverage existing `.github/copilot-coding-agent-instructions.md` navigation docs
- Add diagrams or flowcharts if helpful

## Files to Change

- `docs/frontend/navigation.md` (new file)
