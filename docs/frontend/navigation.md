# Navigation System Documentation

> **Quick Links:** [Configuration Schema](#navigation-configuration-schema) | [Adding Nav Items](#adding-navigation-items) | [Guard Components](#route-guard-components) | [Troubleshooting](#troubleshooting-guide)

## Overview

The FanEngagement application features a comprehensive, role-based navigation system designed for accessibility, mobile-friendliness, and clear user orientation. This document describes the navigation architecture, configuration system, and usage patterns.

**Key Features:**
- **Role-Based Visibility**: Navigation items automatically show/hide based on user roles (PlatformAdmin, OrgAdmin, Member)
- **Organization Context**: Org-scoped items appear only when a user has selected an organization and has appropriate permissions
- **Type-Safe Configuration**: Centralized configuration with TypeScript interfaces ensures consistency
- **Route Guards**: Protect pages with declarative guard components that handle authorization seamlessly

## Design Principles

1. **Accessibility First**: WCAG 2.1 AA compliant with keyboard navigation, screen reader support, and clear focus indicators
2. **Responsive Design**: Mobile-first approach with hamburger menu on small screens and sidebar on desktop
3. **Context Awareness**: Navigation adapts based on user role, active organization, and current location
4. **Visual Clarity**: Clear active states, role badges, and section labeling
5. **Developer Experience**: Single source of truth with clear patterns for adding new items

---

## Navigation Configuration Schema

All navigation is defined in `/frontend/src/navigation/navConfig.ts`. This centralized configuration ensures consistency and makes it easy to add or modify navigation items.

### NavItem Interface

```typescript
interface NavItem {
  id: string;               // Unique identifier for this nav item
  label: string;            // Display text shown to users
  path: string;             // Route path (can include :orgId placeholder)
  roles?: NavRole[];        // Optional: roles that can see this item
  scope?: NavScope;         // Optional: visibility scope (global/org/user)
  order: number;            // Display order (lower = higher priority)
  parentId?: string;        // Optional: parent item ID for breadcrumbs
  icon?: string;            // Optional: icon name for visual enhancement
}
```

### Property Definitions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | ✅ Yes | Unique identifier used for filtering and referencing |
| `label` | `string` | ✅ Yes | User-facing text displayed in navigation |
| `path` | `string` | ✅ Yes | Route path; use `:orgId` placeholder for org-scoped routes |
| `roles` | `NavRole[]` | ❌ No | Roles allowed to see this item. Empty/undefined = all authenticated users |
| `scope` | `NavScope` | ❌ No | Determines visibility context (see Scope Types below) |
| `order` | `number` | ✅ Yes | Numeric ordering within navigation (lower appears first) |
| `parentId` | `string` | ❌ No | Reference to parent item for breadcrumb hierarchy |
| `icon` | `string` | ❌ No | Icon identifier for UI enhancement (future use) |

### Scope Types

Navigation items can have one of three scope types that determine when they appear:

| Scope | Value | When Visible | Use Cases |
|-------|-------|--------------|-----------|
| **Global** | `'global'` | Always visible (if role requirements met) | Platform-wide features like Users, Organizations, Platform Dashboard |
| **Organization** | `'org'` | Only when an organization is selected AND user has OrgAdmin role for that org | Org-specific management: Memberships, Share Types, Proposals, Audit Logs |
| **User** | `'user'` | Always visible to authenticated users | Personal pages: My Account, My Activity, My Organizations |

**Scope Behavior:**
- Items with no scope default to being visible based solely on role requirements
- Org-scoped items require BOTH an active organization AND OrgAdmin/PlatformAdmin role for that org
- User-scoped items have no role restrictions (all authenticated users see them)

### Role Types

```typescript
type NavRole = 'PlatformAdmin' | 'OrgAdmin' | 'Member';
```

| Role | Description | Automatically Granted To |
|------|-------------|-------------------------|
| `PlatformAdmin` | Platform-wide administrator | Users with `isGlobalAdmin = true` |
| `OrgAdmin` | Organization administrator | Users with at least one membership where `role = 'OrgAdmin'` |
| `Member` | Basic authenticated user | All authenticated users |

**Role Hierarchy:**
- `PlatformAdmin` users also have `Member` role
- `OrgAdmin` users also have `Member` role
- Role checks use "has any of" logic: if `roles: ['PlatformAdmin', 'OrgAdmin']`, the item shows if user has EITHER role

### Navigation Context

The system uses a context object to determine what navigation items are visible:

```typescript
interface NavContext {
  isAuthenticated: boolean;           // User is logged in
  isPlatformAdmin: boolean;           // User is a platform administrator
  activeOrgId?: string;               // Currently selected organization ID
  activeOrgRole?: 'OrgAdmin' | 'Member';  // User's role in active org
  memberships: MembershipWithOrganizationDto[];  // All user memberships
}
```

This context is automatically built by the `useNavigation()` hook and used to filter visible items.

---

## Adding Navigation Items

Follow these steps to add a new navigation item to the application.

### Step 1: Add Item to navConfig.ts

Open `/frontend/src/navigation/navConfig.ts` and add your item to the `navItems` array:

```typescript
export const navItems: NavItem[] = [
  // ... existing items ...
  
  // Your new item
  {
    id: 'myNewFeature',                          // Unique ID
    label: 'My New Feature',                     // Display text
    path: '/admin/my-new-feature',               // Route path
    roles: ['PlatformAdmin'],                    // Who can see it
    scope: 'global',                             // When it appears
    order: 16,                                   // Where it appears
  },
];
```

### Step 2: Choose Appropriate Scope and Roles

**For Platform-Wide Features:**
```typescript
{
  id: 'platformFeature',
  label: 'Platform Feature',
  path: '/admin/platform-feature',
  roles: ['PlatformAdmin'],        // Only platform admins
  scope: 'global',                  // Always visible (when role matches)
  order: 10,
}
```

**For Organization-Scoped Features:**
```typescript
{
  id: 'orgFeature',
  label: 'Org Feature',
  path: '/admin/organizations/:orgId/feature',  // Use :orgId placeholder
  roles: ['PlatformAdmin', 'OrgAdmin'],         // Org admins and platform admins
  scope: 'org',                                 // Only when org selected
  order: 20,
}
```

**For User-Personal Features:**
```typescript
{
  id: 'userFeature',
  label: 'My Feature',
  path: '/me/feature',
  // No roles = all authenticated users
  scope: 'user',                    // Personal features
  order: 5,
}
```

### Step 3: Create Your Page Component

Create your page component in the appropriate directory:

```tsx
// /frontend/src/pages/AdminMyNewFeaturePage.tsx
import React from 'react';

export const AdminMyNewFeaturePage: React.FC = () => {
  return (
    <div>
      <h1>My New Feature</h1>
      {/* Your feature content */}
    </div>
  );
};
```

### Step 4: Add Route with Appropriate Guard

In `/frontend/src/routes/index.tsx`, add your route with the correct guard component:

```tsx
import { PlatformAdminRoute } from '../components/PlatformAdminRoute';
import { AdminMyNewFeaturePage } from '../pages/AdminMyNewFeaturePage';

// Inside your route configuration:
<Route path="/admin/my-new-feature" element={
  <PlatformAdminRoute>
    <AdminMyNewFeaturePage />
  </PlatformAdminRoute>
} />
```

### Step 5: Verify Visibility

The navigation system will automatically:
- ✅ Show the item only to users with the specified roles
- ✅ Apply scope-based visibility (global/org/user)
- ✅ Resolve `:orgId` placeholders when rendering links
- ✅ Sort items by the `order` property

**Testing Checklist:**
- [ ] Item appears for users with correct role
- [ ] Item hidden for users without correct role
- [ ] Org-scoped items only show when org selected
- [ ] Link navigates to correct route
- [ ] Route guard properly protects the page

---

## Route Guard Components

Guard components protect routes by checking authentication and authorization before rendering content. They provide consistent redirect behavior and loading states.

### ProtectedRoute

**Purpose:** Ensures user is authenticated (logged in).

**Location:** `/frontend/src/components/ProtectedRoute.tsx`

**Usage:**
```tsx
<Route path="/me/profile" element={
  <ProtectedRoute>
    <UserProfilePage />
  </ProtectedRoute>
} />
```

**Behavior:**
- ✅ Authenticated → Renders children
- ❌ Not authenticated → Redirects to `/login`

**When to Use:** All pages that require login, regardless of role.

---

### AdminRoute

**Purpose:** Allows access to users who are PlatformAdmin or (optionally) OrgAdmin.

**Location:** `/frontend/src/components/AdminRoute.tsx`

**Usage:**
```tsx
// Strict: Only PlatformAdmin
<Route path="/admin/users" element={
  <AdminRoute allowOrgAdmin={false}>
    <AdminUsersPage />
  </AdminRoute>
} />

// Permissive: PlatformAdmin OR any OrgAdmin
<Route path="/admin" element={
  <AdminRoute allowOrgAdmin={true}>
    <AdminLayout />
  </AdminRoute>
} />
```

**Props:**
- `allowOrgAdmin?: boolean` (default: `false`)
  - `false` → Only GlobalAdmin/PlatformAdmin can access
  - `true` → GlobalAdmin OR any user with at least one OrgAdmin membership can access

**Behavior:**
- ✅ PlatformAdmin → Always renders children
- ✅ OrgAdmin (if `allowOrgAdmin={true}`) → Renders children
- ❌ Otherwise → Redirects to `/`

**When to Use:**
- Platform-wide admin pages: `allowOrgAdmin={false}`
- Admin layout wrapper (shared by platform and org admins): `allowOrgAdmin={true}`

---

### OrgAdminRoute

**Purpose:** Protects organization-specific admin pages. Requires user to be PlatformAdmin OR OrgAdmin for the specific organization in the route.

**Location:** `/frontend/src/components/OrgAdminRoute.tsx`

**Usage:**
```tsx
<Route path="/admin/organizations/:orgId/edit" element={
  <OrgAdminRoute>
    <AdminOrganizationEditPage />
  </OrgAdminRoute>
} />
```

**Behavior:**
- ✅ PlatformAdmin → Always renders children (has access to all orgs)
- ✅ OrgAdmin for `:orgId` in route → Renders children
- ❌ Not OrgAdmin for this specific org → Redirects to `/`
- Shows loading state while memberships are being fetched

**How It Works:**
- Extracts `:orgId` from route parameters using `useParams()`
- Checks if user has OrgAdmin role for that specific organization
- PlatformAdmin users bypass the check (have access to all orgs)

**When to Use:** Any page that manages a specific organization's data (memberships, proposals, share types, audit logs, etc.)

---

### PlatformAdminRoute

**Purpose:** Strictest guard—only allows PlatformAdmin (GlobalAdmin) users.

**Location:** `/frontend/src/components/PlatformAdminRoute.tsx`

**Usage:**
```tsx
<Route path="/platform-admin/dashboard" element={
  <PlatformAdminRoute>
    <PlatformDashboardPage />
  </PlatformAdminRoute>
} />
```

**Behavior:**
- ✅ PlatformAdmin → Renders children
- ❌ Not PlatformAdmin → Redirects to `/me/home`

**When to Use:** Platform-wide administrative features that should never be accessible to OrgAdmins (user management, organization creation, platform audit log, dev tools).

---

### Guard Component Comparison Table

| Guard | Allows PlatformAdmin | Allows OrgAdmin (any) | Allows OrgAdmin (specific) | Allows Members | Redirect on Fail |
|-------|---------------------|----------------------|---------------------------|----------------|------------------|
| `ProtectedRoute` | ✅ | ✅ | ✅ | ✅ | `/login` |
| `AdminRoute` (strict) | ✅ | ❌ | ❌ | ❌ | `/` |
| `AdminRoute` (permissive) | ✅ | ✅ | ✅ | ❌ | `/` |
| `OrgAdminRoute` | ✅ | ❌ | ✅ (for route's org) | ❌ | `/` |
| `PlatformAdminRoute` | ✅ | ❌ | ❌ | ❌ | `/me/home` |

---

## Navigation Integration

### useNavigation Hook

The `useNavigation` hook provides filtered, resolved navigation items based on current user context.

**Location:** `/frontend/src/navigation/useNavigation.ts`

**Usage:**
```tsx
import { useNavigation } from '../navigation/useNavigation';

const MyComponent: React.FC = () => {
  const { navItems, homeRoute, isLoading } = useNavigation({
    scope: 'global',  // Optional: filter by scope
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <nav>
      {navItems.map(item => (
        <Link key={item.id} to={item.resolvedPath}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
};
```

**Options:**
```typescript
interface UseNavigationOptions {
  scope?: NavScope;          // Filter by scope: 'global', 'org', or 'user'
  includeIds?: string[];     // Only include specific item IDs
  excludeIds?: string[];     // Exclude specific item IDs
}
```

**Returns:**
```typescript
{
  navItems: ResolvedNavItem[];     // Filtered items with resolved paths
  homeRoute: string;               // Appropriate home route for user
  navContext: NavContext;          // Current navigation context
  isLoading: boolean;              // Whether nav data is still loading
  activeOrg: ActiveOrg | null;     // Currently selected organization
  hasActiveOrg: boolean;           // Whether user has selected an org
}
```

**Path Resolution:**
- `:orgId` placeholders are replaced with `activeOrgId` from context
- The special `home` item resolves to role-appropriate dashboard

### AdminLayout Integration

`AdminLayout.tsx` demonstrates production usage of the navigation system:

**Global Navigation (Platform-Wide):**
```tsx
const globalNavItems = useMemo(() => {
  const items = getVisibleNavItems(navContext, { scope: 'global' });
  return items.map(item => getResolvedNavItem(item, navContext));
}, [navContext]);
```

**Organization Navigation (Org-Scoped):**
```tsx
const orgNavItems = useMemo(() => {
  const items = getVisibleNavItems(navContext, { scope: 'org' });
  return items.map(item => getResolvedNavItem(item, navContext));
}, [navContext]);
```

**Rendering:**
- Global items always appear in sidebar
- Org items only appear when organization is selected AND user is OrgAdmin for that org
- Items are automatically sorted by `order` property

---

## Ordering and Organization

Navigation items are sorted by their `order` property (lower values appear first). Use consistent ranges to maintain visual grouping:

| Order Range | Section | Typical Items |
|-------------|---------|---------------|
| `1-9` | User Personal | My Account, My Activity, My Organizations |
| `10-19` | Platform Admin | Platform Overview, Users, Organizations, Dev Tools |
| `20-29` | Organization Admin | Overview, Memberships, Share Types, Proposals, Webhooks, Audit Log |
| `30+` | Future Extensions | Reserved for additional sections |

**Best Practices:**
- Leave gaps between items (e.g., 10, 15, 20) to allow inserting items later
- Group related items with similar order values
- Use consistent ordering across global, org, and user scopes

---

## Troubleshooting Guide

### Issue: Nav Item Not Appearing

**Symptoms:** Added item to `navItems` array but it doesn't show in navigation.

**Checklist:**
1. ✅ **Check authentication:** User must be logged in
2. ✅ **Check roles:** If item has `roles`, user must have at least one matching role
3. ✅ **Check scope:** 
   - Org-scoped items require active organization AND OrgAdmin role for that org
   - Verify user has selected an organization via OrganizationSelector
4. ✅ **Check spelling:** Ensure `id` is unique and not excluded elsewhere
5. ✅ **Clear cache:** Hard refresh browser (`Cmd+Shift+R` / `Ctrl+Shift+R`)

**Debugging:**
```tsx
// Temporarily log navigation context
const { navContext, navItems } = useNavigation();
console.log('Nav Context:', navContext);
console.log('Visible Items:', navItems);
```

---

### Issue: Wrong Users Can See Nav Item

**Symptoms:** Item appears for users who shouldn't have access.

**Fixes:**
1. **Add/update roles array:**
   ```typescript
   roles: ['PlatformAdmin', 'OrgAdmin'],  // Explicitly list allowed roles
   ```
2. **Add appropriate scope:**
   ```typescript
   scope: 'org',  // Ensure org context is required
   ```
3. **Verify route has matching guard:**
   ```tsx
   <OrgAdminRoute>  // Guard must match nav item requirements
     <YourPage />
   </OrgAdminRoute>
   ```

---

### Issue: Org-Scoped Items Always Hidden

**Symptoms:** Org-scoped nav items never appear, even when org is selected.

**Checklist:**
1. ✅ **User selected organization:** Check OrganizationSelector shows an org
2. ✅ **User has OrgAdmin role:** Verify membership role for selected org
3. ✅ **Path includes :orgId:** Org-scoped paths should use placeholder:
   ```typescript
   path: '/admin/organizations/:orgId/memberships',  // ✅ Correct
   path: '/admin/memberships',                        // ❌ Missing placeholder
   ```
4. ✅ **Roles include OrgAdmin or PlatformAdmin:**
   ```typescript
   roles: ['PlatformAdmin', 'OrgAdmin'],  // ✅ Correct
   roles: ['Member'],                      // ❌ Wrong role
   ```

**Debugging:**
```tsx
const { activeOrg, navContext } = useNavigation();
console.log('Active Org:', activeOrg);
console.log('Active Org Role:', navContext.activeOrgRole);
```

---

### Issue: Route Guard Redirects Incorrectly

**Symptoms:** Guard redirects authorized users away from page.

**Common Causes:**
1. **Wrong guard component for scope:**
   - Platform-wide pages → `PlatformAdminRoute`
   - Org-specific pages → `OrgAdminRoute`
   - Any admin page → `AdminRoute` with `allowOrgAdmin` prop
   - Any authenticated page → `ProtectedRoute`

2. **Guard too strict:**
   ```tsx
   // ❌ Too strict—locks out OrgAdmins
   <AdminRoute allowOrgAdmin={false}>
     <AdminOrgSpecificPage />
   </AdminRoute>
   
   // ✅ Correct—allows OrgAdmins for their orgs
   <OrgAdminRoute>
     <AdminOrgSpecificPage />
   </OrgAdminRoute>
   ```

3. **Missing orgId in route:**
   ```tsx
   // ❌ OrgAdminRoute can't extract orgId
   <Route path="/admin/memberships" element={...} />
   
   // ✅ Correct—includes :orgId parameter
   <Route path="/admin/organizations/:orgId/memberships" element={...} />
   ```

---

### Issue: :orgId Not Resolving in Links

**Symptoms:** Links show `:orgId` literal text instead of actual organization ID.

**Fix:** Use resolved path from navigation hook:
```tsx
// ❌ Wrong—uses raw path
<Link to={item.path}>

// ✅ Correct—uses resolved path
<Link to={item.resolvedPath}>
```

The `getResolvedNavItem()` function automatically replaces `:orgId` with the active organization's ID.

---

### Issue: Navigation Not Updating After Org Switch

**Symptoms:** User switches organizations but nav items don't update.

**Cause:** Navigation context is memoized and depends on `activeOrgId` and `activeOrgRole`.

**Fix:** Ensure `OrgContext` properly updates and triggers re-renders:
```tsx
// This should already work—check if OrgContext is properly provided
const { activeOrg, setActiveOrg } = useActiveOrganization();
```

If the issue persists, check that:
1. `OrgContext.Provider` wraps your app
2. `setActiveOrg()` is called when org changes
3. Components using navigation are inside the provider

---

## Best Practices

### 1. Keep Navigation Configuration Centralized
- ❌ Don't hardcode nav items in components
- ✅ Always define items in `navConfig.ts`

### 2. Use Descriptive IDs
```typescript
// ❌ Bad
id: 'page1',

// ✅ Good
id: 'manageMemberships',
```

### 3. Match Route Guards to Nav Item Roles
```typescript
// navConfig.ts
{
  id: 'manageUsers',
  roles: ['PlatformAdmin'],
  // ...
}

// routes/index.tsx
<Route path="/admin/users" element={
  <PlatformAdminRoute>  {/* ✅ Matches PlatformAdmin role requirement */}
    <AdminUsersPage />
  </PlatformAdminRoute>
} />
```

### 4. Use Consistent Path Patterns
- Platform admin: `/platform-admin/*`
- Organization admin: `/admin/organizations/:orgId/*`
- Global admin pages: `/admin/*`
- User pages: `/me/*`

### 5. Test Role Combinations
When adding new nav items, test with:
- PlatformAdmin user
- OrgAdmin user (with multiple org memberships)
- Regular Member user
- Unauthenticated user

### 6. Document Complex Visibility Logic
If a nav item has unusual visibility requirements, add a comment:
```typescript
{
  id: 'specialFeature',
  label: 'Special Feature',
  path: '/admin/special',
  roles: ['PlatformAdmin'],
  scope: 'global',
  order: 15,
  // NOTE: This feature is only enabled in production for GlobalAdmins
  // See FeatureFlagService for runtime checks
},
```

---

## Related Files

### Core Configuration
- **`frontend/src/navigation/navConfig.ts`** - Central navigation configuration, item definitions, filtering logic
- **`frontend/src/navigation/useNavigation.ts`** - React hook for accessing filtered navigation items
- **`frontend/src/navigation/index.ts`** - Public exports for navigation system

### Guard Components
- **`frontend/src/components/ProtectedRoute.tsx`** - Ensures authentication
- **`frontend/src/components/AdminRoute.tsx`** - Platform/org admin guard with flexibility
- **`frontend/src/components/OrgAdminRoute.tsx`** - Organization-specific admin guard
- **`frontend/src/components/PlatformAdminRoute.tsx`** - Strict platform admin guard

### Layout & Rendering
- **`frontend/src/components/AdminLayout.tsx`** - Admin UI with sidebar navigation
- **`frontend/src/components/MobileNav.tsx`** - Mobile navigation drawer
- **`frontend/src/routes/index.tsx`** - Route definitions with guards

### Context & State
- **`frontend/src/contexts/OrgContext.tsx`** - Active organization state management
- **`frontend/src/hooks/usePermissions.tsx`** - User permissions and memberships
- **`frontend/src/auth/AuthContext.tsx`** - Authentication state

### Related Documentation
- **`docs/frontend/keyboard-navigation.md`** - Keyboard shortcuts and accessibility
- **`docs/architecture.md`** - Overall system architecture
- **`docs/authorization.md`** - Authorization rules and patterns
