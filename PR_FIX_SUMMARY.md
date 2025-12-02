# PR Summary: Fix Navigation to Respect Active Organization Role

## Issue
[Dev] Update menu: Administration should not display for non-admin orgs and Home menu should respect org role

## Problem Statement
The navigation system was not correctly respecting the user's role in the **currently selected organization**. Specifically:

1. The "Home" link always navigated to the admin dashboard if a user was an OrgAdmin in ANY organization, even when they had selected an organization where they were only a Member
2. The "Administration" section visibility was already working correctly but needed to be verified

## Solution

### Code Changes
Modified `getDefaultHomeRoute()` in `frontend/src/navigation/navConfig.ts` to check the user's role for the **active organization** rather than checking if they are OrgAdmin in any organization.

**Before:**
```typescript
// OrgAdmins go to admin dashboard
if (context.memberships.some(m => m.role === 'OrgAdmin')) {
  return '/admin';
}
```

**After:**
```typescript
// If active org is selected, check role for that specific org
if (context.activeOrgId && context.activeOrgRole) {
  // OrgAdmin for active org goes to admin dashboard
  if (context.activeOrgRole === 'OrgAdmin') {
    return '/admin';
  }
  // Member of active org goes to member dashboard
  return '/me/home';
}

// No active org selected - check if user is OrgAdmin in any org
if (context.memberships.some(m => m.role === 'OrgAdmin')) {
  return '/admin';
}
```

### Test Changes
1. **Unit Tests** (`frontend/src/navigation/navConfig.test.ts`):
   - Added 5 new test cases covering:
     - OrgAdmin with admin org active → `/admin`
     - OrgAdmin with member org active → `/me/home`
     - OrgAdmin with no active org → `/admin`
     - Home link resolution for mixed-role scenarios

2. **E2E Tests** (`frontend/e2e/nav-visibility.spec.ts`):
   - Added comprehensive test for organization switching:
     - Verifies "Administration" section appears for admin orgs
     - Verifies "Administration" section disappears for member orgs
     - Verifies Home link changes based on active org role
     - Tests with alice@example.com who is OrgAdmin of "Tech Innovators" and Member of "Green Energy United"

### Documentation Updates
Updated `docs/frontend-header-navigation.md` to explain:
- How the Home link changes based on active organization role
- How the Administration section respects the selected organization
- Behavior for users with mixed roles across organizations

## Verification

### Build & Tests
- ✅ All 387 unit tests pass
- ✅ All 37 navigation config tests pass (including 5 new tests)
- ✅ Frontend build succeeds
- ✅ Code review: No issues found
- ✅ CodeQL security scan: No alerts

### Files Changed
```
docs/frontend-header-navigation.md        |  9 ++++
frontend/e2e/nav-visibility.spec.ts       | 40 ++++++++++++++++
frontend/src/navigation/navConfig.test.ts | 62 ++++++++++++++++++++++++
frontend/src/navigation/navConfig.ts      | 12 ++++-
4 files changed, 122 insertions(+), 1 deletion(-)
```

## Test Commands

### Build
```bash
cd frontend
npm install
npm run build
```

### Unit Tests
```bash
cd frontend
npm test
```

### E2E Tests
```bash
cd frontend
npm run test:e2e
```

Note: E2E tests require a running backend instance with seeded dev data.

## Behavior Examples

### Scenario 1: User is OrgAdmin of Org A and Member of Org B

**When Org A is selected (OrgAdmin):**
- Home link → `/admin` (Admin Dashboard)
- Administration section → Visible
- Can access org admin features

**When Org B is selected (Member):**
- Home link → `/me/home` (Member Dashboard)
- Administration section → Hidden
- Shows "You are a member of this organization" message with link to member view

### Scenario 2: Platform Admin
- Always goes to `/platform-admin/dashboard`
- No organization selector visible
- Has access to all platform admin features

### Scenario 3: Regular Member (no admin orgs)
- Always goes to `/me/home`
- No Administration section ever shown
- Organization selector shows all member orgs

## Security Considerations
- No security vulnerabilities introduced (CodeQL scan passed)
- Authorization checks remain unchanged - only navigation UX updated
- Server-side authorization still enforces role-based access control
