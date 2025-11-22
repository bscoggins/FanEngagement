import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { membershipsApi } from '../api/membershipsApi';
import type { MembershipWithOrganizationDto } from '../types/api';

interface PermissionsContextType {
  isGlobalAdmin: () => boolean;
  isOrgAdmin: (orgId: string) => boolean;
  isOrgMember: (orgId: string) => boolean;
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
 * const { isGlobalAdmin, isOrgAdmin, isOrgMember } = usePermissions();
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
 */
export const usePermissions = (): PermissionsContextType => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [memberships, setMemberships] = useState<MembershipWithOrganizationDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMemberships = async () => {
    if (!isAuthenticated || !user?.userId) {
      setMemberships([]);
      return;
    }

    try {
      setIsLoading(true);
      const data = await membershipsApi.getByUserId(user.userId);
      setMemberships(data);
    } catch (error) {
      console.error('Failed to fetch memberships:', error);
      setMemberships([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, [isAuthenticated, user?.userId]);

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

  return {
    isGlobalAdmin,
    isOrgAdmin,
    isOrgMember,
    memberships,
    isLoading,
    refreshMemberships: fetchMemberships,
  };
};
