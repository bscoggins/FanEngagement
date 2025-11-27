import { useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveOrganization } from '../contexts/OrgContext';
import type { NavContext, NavItem, NavScope } from './navConfig';
import {
  getVisibleNavItems,
  getResolvedNavItem,
  getDefaultHomeRoute,
} from './navConfig';

/**
 * Options for filtering navigation items
 */
interface UseNavigationOptions {
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

/**
 * A navigation item with its resolved path
 */
export interface ResolvedNavItem extends NavItem {
  resolvedPath: string;
}

/**
 * Hook that provides role-based navigation items for the current user.
 * 
 * This hook combines the current user's authentication state, permissions,
 * and active organization context to determine which navigation items
 * should be displayed.
 * 
 * @param options - Optional filtering options
 * @returns An object containing the navigation items and helper functions
 */
export const useNavigation = (options?: UseNavigationOptions) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { memberships, isLoading: permissionsLoading } = usePermissions();
  const { activeOrg, isLoading: orgLoading } = useActiveOrganization();

  const isLoading = permissionsLoading || orgLoading;

  // Build the navigation context
  const navContext: NavContext = useMemo(() => ({
    isAuthenticated,
    isPlatformAdmin: isAdmin,
    activeOrgId: activeOrg?.id,
    activeOrgRole: activeOrg?.role,
    memberships,
  }), [isAuthenticated, isAdmin, activeOrg?.id, activeOrg?.role, memberships]);

  // Get visible items based on user context and options
  const navItems: ResolvedNavItem[] = useMemo(() => {
    if (!isAuthenticated) {
      return [];
    }
    
    const visibleItems = getVisibleNavItems(navContext, options);
    return visibleItems.map(item => getResolvedNavItem(item, navContext));
  }, [navContext, isAuthenticated, options?.scope, options?.includeIds, options?.excludeIds]);

  // Get the appropriate home route for the current user
  const homeRoute = useMemo(() => {
    return getDefaultHomeRoute(navContext);
  }, [navContext]);

  return {
    /**
     * The filtered and resolved navigation items for the current user
     */
    navItems,
    /**
     * The appropriate home route for the current user based on their role
     */
    homeRoute,
    /**
     * The current navigation context
     */
    navContext,
    /**
     * Whether the navigation data is still loading
     */
    isLoading,
    /**
     * The active organization (if any)
     */
    activeOrg,
    /**
     * Whether the user has an active organization selected
     */
    hasActiveOrg: !!activeOrg,
  };
};
