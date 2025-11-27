import type { MembershipWithOrganizationDto } from '../types/api';

/**
 * Navigation item visibility scope
 */
export type NavScope = 'global' | 'org' | 'user';

/**
 * User role types for navigation
 */
export type NavRole = 'PlatformAdmin' | 'OrgAdmin' | 'Member';

/**
 * Navigation item configuration
 */
export interface NavItem {
  id: string;
  label: string;
  /**
   * Path to navigate to. Can include :orgId placeholder for org-scoped items.
   */
  path: string;
  /**
   * Roles that can see this item. If empty/undefined, visible to all authenticated users.
   */
  roles?: NavRole[];
  /**
   * Scope of the navigation item.
   * - 'global': Platform-wide items (Users, Organizations)
   * - 'org': Organization-scoped items (Manage Memberships)
   * - 'user': User-specific items (My Account, My Organizations)
   */
  scope?: NavScope;
  /**
   * Order for display within the navigation (lower = higher priority)
   */
  order: number;
}

/**
 * Context for determining navigation visibility
 */
export interface NavContext {
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  activeOrgId?: string;
  activeOrgRole?: 'OrgAdmin' | 'Member';
  memberships: MembershipWithOrganizationDto[];
}

/**
 * All navigation items available in the application.
 * Items are filtered based on user role and context.
 */
export const navItems: NavItem[] = [
  // User items - available to all authenticated users
  {
    id: 'home',
    label: 'Home',
    path: '/me/home', // NOTE: This item's path is dynamically resolved to getDefaultHomeRoute() by getResolvedNavItem()
    scope: 'user',
    order: 1,
  },
  {
    id: 'myAccount',
    label: 'My Account',
    path: '/me',
    scope: 'user',
    order: 2,
  },
  {
    id: 'myOrganizations',
    label: 'My Organizations',
    path: '/me/organizations',
    scope: 'user',
    order: 3,
  },

  // Platform Admin items - only for GlobalAdmin
  {
    id: 'platformDashboard',
    label: 'Platform Overview',
    path: '/platform-admin/dashboard',
    roles: ['PlatformAdmin'],
    scope: 'global',
    order: 10,
  },
  {
    id: 'adminDashboard',
    label: 'Admin Dashboard',
    path: '/admin',
    roles: ['PlatformAdmin', 'OrgAdmin'],
    scope: 'global',
    order: 11,
  },
  {
    id: 'manageUsers',
    label: 'Users',
    path: '/admin/users',
    roles: ['PlatformAdmin'],
    scope: 'global',
    order: 12,
  },
  {
    id: 'manageOrganizations',
    label: 'Organizations',
    path: '/admin/organizations',
    roles: ['PlatformAdmin'],
    scope: 'global',
    order: 13,
  },
  {
    id: 'devTools',
    label: 'Dev Tools',
    path: '/admin/dev-tools',
    roles: ['PlatformAdmin'],
    scope: 'global',
    order: 14,
  },

  // Org Admin items - scoped to current organization
  {
    id: 'manageOrgSettings',
    label: 'Organization Settings',
    path: '/admin/organizations/:orgId/edit',
    roles: ['PlatformAdmin', 'OrgAdmin'],
    scope: 'org',
    order: 20,
  },
  {
    id: 'manageMemberships',
    label: 'Manage Memberships',
    path: '/admin/organizations/:orgId/memberships',
    roles: ['PlatformAdmin', 'OrgAdmin'],
    scope: 'org',
    order: 21,
  },
  {
    id: 'manageShareTypes',
    label: 'Share Types',
    path: '/admin/organizations/:orgId/share-types',
    roles: ['PlatformAdmin', 'OrgAdmin'],
    scope: 'org',
    order: 22,
  },
  {
    id: 'manageProposals',
    label: 'Proposals',
    path: '/admin/organizations/:orgId/proposals',
    roles: ['PlatformAdmin', 'OrgAdmin'],
    scope: 'org',
    order: 23,
  },
  {
    id: 'webhookEvents',
    label: 'Webhook Events',
    path: '/admin/organizations/:orgId/webhook-events',
    roles: ['PlatformAdmin', 'OrgAdmin'],
    scope: 'org',
    order: 24,
  },
];

/**
 * Determines the user's roles for navigation purposes
 */
export const getUserRoles = (context: NavContext): NavRole[] => {
  const roles: NavRole[] = [];

  if (!context.isAuthenticated) {
    return roles;
  }

  if (context.isPlatformAdmin) {
    roles.push('PlatformAdmin');
  }

  // Check if user is OrgAdmin in any organization
  if (context.memberships.some(m => m.role === 'OrgAdmin')) {
    roles.push('OrgAdmin');
  }

  // All authenticated users are Members
  roles.push('Member');

  return roles;
};

/**
 * Checks if a user has any of the required roles for a nav item
 */
const hasRequiredRole = (userRoles: NavRole[], itemRoles?: NavRole[]): boolean => {
  // If no roles specified, item is available to all authenticated users
  if (!itemRoles || itemRoles.length === 0) {
    return true;
  }
  return itemRoles.some(role => userRoles.includes(role));
};

/**
 * Resolves the path with org-specific placeholders
 */
export const resolvePath = (path: string, orgId?: string): string => {
  if (orgId) {
    return path.replace(':orgId', orgId);
  }
  return path;
};

/**
 * Determines the appropriate home route based on user context
 */
export const getDefaultHomeRoute = (context: NavContext): string => {
  if (!context.isAuthenticated) {
    return '/login';
  }

  // Platform admins go to platform admin dashboard
  if (context.isPlatformAdmin) {
    return '/platform-admin/dashboard';
  }

  // OrgAdmins go to admin dashboard
  if (context.memberships.some(m => m.role === 'OrgAdmin')) {
    return '/admin';
  }

  // Regular members go to member dashboard
  return '/me/home';
};

/**
 * Filters navigation items based on user context
 */
export const getVisibleNavItems = (
  context: NavContext,
  options?: {
    /**
     * Filter by scope (e.g., 'user', 'org', 'global')
     */
    scope?: NavScope;
    /**
     * Filter by specific item IDs
     */
    includeIds?: string[];
    /**
     * Exclude specific item IDs
     */
    excludeIds?: string[];
  }
): NavItem[] => {
  if (!context.isAuthenticated) {
    return [];
  }

  const userRoles = getUserRoles(context);
  
  // Check if user is OrgAdmin for the active organization
  const isOrgAdminForActiveOrg = context.activeOrgId
    ? context.isPlatformAdmin || context.memberships.some(
        m => m.organizationId === context.activeOrgId && m.role === 'OrgAdmin'
      )
    : false;

  return navItems
    .filter(item => {
      // Filter by include IDs if specified
      if (options?.includeIds && !options.includeIds.includes(item.id)) {
        return false;
      }

      // Filter by exclude IDs if specified
      if (options?.excludeIds?.includes(item.id)) {
        return false;
      }

      // Filter by scope if specified
      if (options?.scope && item.scope !== options.scope) {
        return false;
      }

      // Check role requirements
      if (!hasRequiredRole(userRoles, item.roles)) {
        return false;
      }

      // For org-scoped items, check if there's an active org and user has proper role
      if (item.scope === 'org') {
        if (!context.activeOrgId) {
          return false;
        }
        // User needs to be OrgAdmin or PlatformAdmin for the active org
        if (!isOrgAdminForActiveOrg) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => a.order - b.order);
};

/**
 * Gets the resolved path for a nav item based on context
 */
export const getResolvedNavItem = (
  item: NavItem,
  context: NavContext
): NavItem & { resolvedPath: string } => {
  let resolvedPath: string;

  // Special handling for home - resolve based on role
  if (item.id === 'home') {
    resolvedPath = getDefaultHomeRoute(context);
  } else {
    // Resolve org placeholder
    resolvedPath = resolvePath(item.path, context.activeOrgId);
  }

  return {
    ...item,
    resolvedPath,
  };
};
