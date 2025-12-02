# Navigation Behavior: Before vs After

This document illustrates the navigation behavior changes for users with mixed organization roles.

## Test Scenario
**User: Alice (alice@example.com)**
- OrgAdmin of "Tech Innovators"
- Member of "Green Energy United"

## Before the Fix

### Problem 1: Home Link Always Goes to Admin Dashboard
Even when Alice selected "Green Energy United" (where she's only a Member), clicking the "Home" link would take her to `/admin` (Admin Dashboard) instead of `/me/home` (Member Dashboard).

**Why?** The code checked: "Is Alice an OrgAdmin in ANY organization?" → Yes → Send to `/admin`

### Problem 2: Administration Section Visibility
The Administration section visibility was **already working correctly** - it properly checked the role for the selected organization.

## After the Fix

### Solution: Respect Active Organization Role

The `getDefaultHomeRoute()` function now follows this logic:

```
1. Is user a Platform Admin?
   YES → /platform-admin/dashboard
   NO → Continue

2. Is there an active organization selected?
   YES → Check role for that specific org:
         - OrgAdmin → /admin
         - Member → /me/home
   NO → Continue

3. Is user OrgAdmin in ANY organization?
   YES → /admin
   NO → /me/home
```

## Behavior Examples

### Scenario A: Alice selects "Tech Innovators" (where she's OrgAdmin)

**Navigation:**
- Home link → `/admin` ✅
- Administration section → Visible ✅
- Sidebar shows: "Tech Innovators" with "Org Admin" badge

**User can access:**
- Organization Overview
- Manage Memberships
- Manage Share Types
- Manage Proposals
- Webhook Events

### Scenario B: Alice selects "Green Energy United" (where she's Member)

**Navigation:**
- Home link → `/me/home` ✅ (Changed!)
- Administration section → Hidden ✅
- Sidebar shows: "Green Energy United" with message:
  "You are a member of this organization. View organization →"

**User can access:**
- My Account
- My Organizations
- Member view of Green Energy United

### Scenario C: Alice hasn't selected an organization yet

**Navigation:**
- Home link → `/admin` ✅
- Shows admin landing page since she's OrgAdmin somewhere

**Behavior:**
- Once she selects an org from the dropdown, navigation updates accordingly

## Code Changes Summary

### File: `frontend/src/navigation/navConfig.ts`

**Before:**
```typescript
export const getDefaultHomeRoute = (context: NavContext): string => {
  if (!context.isAuthenticated) {
    return '/login';
  }
  
  if (context.isPlatformAdmin) {
    return '/platform-admin/dashboard';
  }
  
  // ❌ Problem: Always checks if user is OrgAdmin in ANY org
  if (context.memberships.some(m => m.role === 'OrgAdmin')) {
    return '/admin';
  }
  
  return '/me/home';
};
```

**After:**
```typescript
export const getDefaultHomeRoute = (context: NavContext): string => {
  if (!context.isAuthenticated) {
    return '/login';
  }

  if (context.isPlatformAdmin) {
    return '/platform-admin/dashboard';
  }

  // ✅ Solution: Check role for active org first
  if (context.activeOrgId && context.activeOrgRole) {
    if (context.activeOrgRole === 'OrgAdmin') {
      return '/admin';
    }
    return '/me/home';
  }

  // Fallback: Check if user is OrgAdmin in any org
  if (context.memberships.some(m => m.role === 'OrgAdmin')) {
    return '/admin';
  }

  return '/me/home';
};
```

## Testing

### Unit Tests (5 new tests added)
```typescript
// Test 1: Admin org selected
it('returns /admin for OrgAdmin when active org is their admin org', () => {
  const context = {
    memberships: [
      { role: 'OrgAdmin', organizationId: 'org-1' },
      { role: 'Member', organizationId: 'org-2' },
    ],
    activeOrgId: 'org-1',
    activeOrgRole: 'OrgAdmin',
  };
  expect(getDefaultHomeRoute(context)).toBe('/admin');
});

// Test 2: Member org selected
it('returns /me/home for OrgAdmin when active org is their member-only org', () => {
  const context = {
    memberships: [
      { role: 'OrgAdmin', organizationId: 'org-1' },
      { role: 'Member', organizationId: 'org-2' },
    ],
    activeOrgId: 'org-2',
    activeOrgRole: 'Member',
  };
  expect(getDefaultHomeRoute(context)).toBe('/me/home');
});
```

### E2E Test
Added comprehensive test that:
1. Logs in as Alice
2. Verifies she lands on `/admin` (Tech Innovators is selected by default)
3. Verifies Administration section is visible
4. Switches to Green Energy United
5. Verifies navigation to member view
6. Goes back to admin layout
7. Verifies Administration section is NOT visible
8. Verifies Home link points to `/me/home`

## User Impact

### Positive Changes
✅ Navigation now correctly reflects the user's capabilities in the selected organization
✅ Prevents confusion when users have different roles in different organizations
✅ Home link provides consistent context-appropriate navigation
✅ Clear visual feedback (Administration section appears/disappears)

### No Negative Impact
✅ No changes to authorization logic (security unchanged)
✅ No breaking changes to existing functionality
✅ Platform Admins unaffected
✅ Single-role users unaffected

## Screenshots Reference

The issue referenced three screenshots showing:
1. Alice as OrgAdmin of Tech Innovators - showing admin view
2. Bob as Member of Tech Innovators - showing member view
3. Alice as Member of Green Energy United - incorrectly showing admin view

After this fix:
- Screenshot 1 behavior: ✅ Unchanged (correct)
- Screenshot 2 behavior: ✅ Unchanged (correct)
- Screenshot 3 behavior: ✅ **Fixed** (now shows member view)
