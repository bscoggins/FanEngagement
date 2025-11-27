import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { membershipsApi } from '../api/membershipsApi';
import type { MembershipWithOrganizationDto } from '../types/api';

interface PermissionsContextType {
  isGlobalAdmin: () => boolean;
  isOrgAdmin: (orgId: string) => boolean;
  isOrgMember: (orgId: string) => boolean;
  hasAnyOrgAdminRole: () => boolean;
  canAccessAdminArea: () => boolean;
  memberships: MembershipWithOrganizationDto[];
  isLoading: boolean;
  refreshMemberships: () => Promise<void>;
}

/**
 * Custom hook that provides permission checking helpers for the current user.
 * 
 * This hook extends the basic auth context with organization-level permissions
 * by fetching and caching the user's organization memberships.
 * 
 * @returns {PermissionsContextType} Permission helpers and membership data
 * 
 * @example
 * const { isGlobalAdmin, isOrgAdmin, isOrgMember, hasAnyOrgAdminRole, canAccessAdminArea } = usePermissions();
 * 
 * if (isGlobalAdmin()) {
 *   // Show platform admin features
 * }
 * 
 * if (isOrgAdmin(orgId)) {
 *   // Show org admin features
 * }
 * 
 * if (isOrgMember(orgId)) {
 *   // Show member features
 * }
 * 
 * if (canAccessAdminArea()) {
 *   // Show Admin link in navigation
 * }
 * 
 * if (hasAnyOrgAdminRole()) {
 *   // User is OrgAdmin in at least one organization
 * }
 */
export const usePermissions = (): PermissionsContextType => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [memberships, setMemberships] = useState<MembershipWithOrganizationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start as true, will be set to false after first fetch

  const fetchMemberships = useCallback(async (signal?: AbortSignal) => {
    if (!isAuthenticated || !user?.userId) {
      setMemberships([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await membershipsApi.getByUserId(user.userId);
      if (!signal?.aborted) {
        setMemberships(data);
      }
    } catch (error) {
      if (!signal?.aborted) {
        console.error('Failed to fetch memberships:', error);
        setMemberships([]);
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchMemberships(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [fetchMemberships]);

  const isGlobalAdmin = (): boolean => {
    return isAdmin;
  };

  const isOrgAdmin = (orgId: string): boolean => {
    // Global admins have implicit OrgAdmin permissions for all organizations
    if (isAdmin) {
      return true;
    }

    // Check if user has OrgAdmin role for the specific organization
    const membership = memberships.find(m => m.organizationId === orgId);
    return membership?.role === 'OrgAdmin';
  };

  const isOrgMember = (orgId: string): boolean => {
    // Global admins have implicit membership in all organizations
    if (isAdmin) {
      return true;
    }

    // Check if user has any membership (OrgAdmin or Member) for the organization
    return memberships.some(m => m.organizationId === orgId);
  };

  /**
   * Checks if the user has OrgAdmin role in at least one organization.
   * Useful for navigation visibility decisions.
   * Note: This returns false for GlobalAdmins who aren't explicit OrgAdmins.
   * Use canAccessAdminArea() for checking admin area access.
   */
  const hasAnyOrgAdminRole = (): boolean => {
    return memberships.some(m => m.role === 'OrgAdmin');
  };

  /**
   * Checks if the user can access the admin area (/admin).
   * Returns true if user is GlobalAdmin OR OrgAdmin in at least one org.
   * Useful for showing/hiding the Admin nav link.
   */
  const canAccessAdminArea = (): boolean => {
    return isAdmin || hasAnyOrgAdminRole();
  };

  return {
    isGlobalAdmin,
    isOrgAdmin,
    isOrgMember,
    hasAnyOrgAdminRole,
    canAccessAdminArea,
    memberships,
    isLoading,
    refreshMemberships: () => fetchMemberships(undefined),
  };
};
