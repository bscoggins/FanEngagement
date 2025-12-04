# Story E-008-02: Organization Switcher with Role Badges

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** A – Navigation Redesign  
**Theme:** T1/T2 – Member Engagement & OrgAdmin Efficiency  
**Priority:** Now  
**Status:** Proposed

---

## Summary

Improve the organization switcher with clear role badges showing whether the user is an Admin or Member in each organization. Add visual highlights, keyboard navigation, and mobile-friendly interactions.

---

## User Story

> As a **multi-org user**, I want **an improved organization switcher with role badges**, so that **I can easily switch between my organizations and understand my role in each**.

---

## Acceptance Criteria

- [ ] Org switcher shows organization name with role badge (e.g., "Org Name (Admin)" or "Org Name (Member)")
- [ ] Current org is visually highlighted in dropdown
- [ ] Switching orgs updates nav items and redirects to appropriate dashboard
- [ ] Keyboard accessible (arrow keys, Enter to select, Escape to close)
- [ ] Tooltip shows full org name if truncated
- [ ] Works on mobile (touch-friendly tap target)
- [ ] Uses design system tokens for colors, spacing, and typography
- [ ] ARIA labels and roles for screen reader accessibility

---

## Implementation Notes

### Components to Update
- `frontend/src/components/OrganizationSelector.tsx`

### Design System Tokens to Use
- `--color-primary-600` for active org highlight
- `--color-neutral-600` for role badge text
- `--spacing-2`, `--spacing-3` for padding
- `--font-size-sm` for role badge
- `--radius-md` for rounded corners

### Functionality
- Use existing `useActiveOrganization()` hook for org context
- Query `/users/me/organizations` for org list with roles
- Update active org in context on selection
- Redirect based on role:
  - OrgAdmin → `/admin/organizations/:orgId/edit`
  - Member → `/me/organizations/:orgId`

### Optional Enhancement
- Search/filter for users with many organizations (10+)

---

## Testing Requirements

### Unit Tests
- [ ] OrganizationSelector renders correctly with role badges
- [ ] Click handler switches active org
- [ ] Keyboard navigation works (arrow keys, Enter, Escape)

### Accessibility Tests
- [ ] Screen reader announces org name and role
- [ ] Keyboard focus visible
- [ ] ARIA expanded state toggles correctly

### Visual Tests
- [ ] Mobile tap target is 44x44px minimum
- [ ] Truncated org names show tooltip on hover
- [ ] Active org has distinct visual highlight

---

## Files to Change

- `frontend/src/components/OrganizationSelector.tsx`
- `frontend/src/components/OrganizationSelector.test.tsx`

---

## Related Stories

- **E-008-01**: Navigation redesign (provides layout foundation)
- **E-008-04**: Keyboard navigation enhancements
- **E-008-09**: Design system tokens (colors, spacing, typography)

---

## Definition of Done

- [ ] Code implemented and reviewed
- [ ] Tests pass (unit, accessibility)
- [ ] Works on mobile and desktop
- [ ] Screen reader tested
- [ ] Keyboard navigation verified
- [ ] Design system tokens applied
- [ ] Documentation updated if needed
