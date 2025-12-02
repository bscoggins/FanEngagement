# Frontend Header and Navigation UX

## Overview

The FanEngagement frontend uses a unified header and sidebar navigation pattern that adapts based on user roles and organization memberships.

## Header Structure

### All Users (except Platform Admin)
The header displays:
- **Application Title**: "FanEngagement" (clickable, navigates to appropriate home)
- **Organization Dropdown**: Located in the header for easy access, lists all organizations the user belongs to
- **Logout Button**: Allows users to log out

### Platform Admin
The header displays:
- **Application Title**: "FanEngagement Platform Admin" 
- **Platform Admin Badge**: Red badge indicating platform admin status
- **Logout Button**: Allows users to log out
- **No Organization Dropdown**: Platform admins don't have an organization context selector

## Organization Dropdown Behavior

### Location
The organization dropdown is **always in the header** for non-platform admins, replacing the previous username display.

### Functionality
- Lists all organizations the user has access to (either as Member or OrgAdmin)
- Selecting an organization updates the left sidebar navigation based on the user's role:
  - **OrgAdmin role**: Shows full organization admin navigation (Overview, Memberships, Share Types, Proposals, Webhook Events)
  - **Member role**: Shows minimal member navigation with a link to view the organization

### Navigation Updates
When switching organizations:
- For **OrgAdmin** role: Navigates to `/admin/organizations/{orgId}/edit`
- For **Member** role: Navigates to `/me/organizations/{orgId}`
- The "Home" link in the sidebar footer updates to reflect the user's role in the **currently selected** organization:
  - OrgAdmin for selected org: Home → `/admin` (Admin Dashboard)
  - Member of selected org: Home → `/me/home` (Member Dashboard)

### Role-Based Navigation
The navigation system respects the user's role in the **currently selected organization**:
- Users who are OrgAdmin in one organization but Member in another will see different navigation options depending on which organization is selected
- The "Administration" section in the sidebar only appears when the selected organization grants OrgAdmin privileges
- When a Member-only organization is selected, the sidebar displays a message "You are a member of this organization" with a link to view the organization

## Sidebar Navigation

### Organization Context Display
Instead of a dropdown in the sidebar, the sidebar now displays:
- **Organization Name**: The currently selected organization
- **Role Badge**: Color-coded badge showing "Org Admin" (blue) or "Member" (gray)
- **Organization-specific Navigation**: Links that appear based on role

### Navigation Structure
1. **User Navigation** (top of sidebar)
   - Home
   - My Account
   - My Organizations

2. **Organization Navigation** (middle of sidebar, only when org is selected)
   - Organization name and role badge
   - Admin navigation items (if OrgAdmin)
   - Member information and link (if Member)

3. **Administration Navigation** (bottom of sidebar, only for admins)
   - Platform-level admin links (Platform Overview, Organizations, Users, Dev Tools)

## Design Principles

1. **Single Source of Truth**: Only one organization selector exists in the UI (in the header)
2. **Context Awareness**: The sidebar navigation dynamically updates based on the selected organization and user's role
3. **Privacy**: Username/email is no longer displayed in the header
4. **Consistency**: All role-based layouts (Layout, AdminLayout) follow the same pattern, except PlatformAdminLayout which has no org selector

## Testing

### Unit Tests
- Layout component tests verify the header dropdown and sidebar display
- AdminLayout component tests verify role-based navigation
- PlatformAdminLayout "no org selector" behavior is covered by E2E tests (no unit test file)

### E2E Tests
E2E tests validate:
- Organization selection and navigation behavior
- Role-based navigation visibility
- Platform admin isolation (no org dropdown)

To run E2E tests:
```bash
# From frontend directory
npm run test:e2e
```

Note: E2E tests require a running backend instance.
