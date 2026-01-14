import { useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useActiveOrganization } from '../contexts/OrgContext';
import {
  type SearchContextConfig,
  type SearchableResource,
  MEMBERS_CAN_SEARCH_MEMBERS,
  getSearchPlaceholder,
} from '../search/searchConfig';

/**
 * Hook that determines the search context based on the user's role and active organization.
 * 
 * Search context determines:
 * - What resources can be searched (users, organizations, proposals, members, shareTypes)
 * - Navigation routes when selecting results (platformAdmin, orgAdmin, member)
 * - Placeholder text for the search input
 * 
 * Behavior by role:
 * - Platform Admin: Search all users and organizations
 * - Org Admin (with active org): Search org's proposals, members, share types, and own organizations
 * - Org Admin (no active org): Search own organizations only
 * - Member (with active org): Search org's proposals, members (if enabled), and own organizations  
 * - Member (no active org): Search own organizations only
 */
export function useSearchContext(): SearchContextConfig {
  const { isAdmin, isAuthenticated } = useAuth();
  const { activeOrg } = useActiveOrganization();

  return useMemo(() => {
    // Not authenticated - no search available
    if (!isAuthenticated) {
      return {
        resources: [],
        placeholder: 'Search...',
        routeMode: 'member' as const,
      };
    }

    // Platform Admin: search all users, organizations, and proposals
    if (isAdmin) {
      return {
        resources: ['users', 'organizations', 'proposals'] as SearchableResource[],
        placeholder: 'Search users, organizations, proposals...',
        routeMode: 'platformAdmin' as const,
      };
    }

    // No active organization selected - can search own organizations and proposals
    if (!activeOrg) {
      return {
        resources: ['organizations', 'proposals'] as SearchableResource[],
        placeholder: 'Search organizations, proposals...',
        routeMode: 'member' as const,
      };
    }

    // Org Admin with active organization
    if (activeOrg.role === 'OrgAdmin') {
      const resources: SearchableResource[] = [
        'organizations',
        'proposals',
        'members',
        'shareTypes',
      ];
      
      return {
        resources,
        organizationId: activeOrg.id,
        organizationName: activeOrg.name,
        placeholder: getSearchPlaceholder(resources, activeOrg.name),
        routeMode: 'orgAdmin' as const,
      };
    }

    // Regular Member with active organization
    const memberResources: SearchableResource[] = ['organizations', 'proposals'];
    
    // Only include members if the feature flag allows it
    if (MEMBERS_CAN_SEARCH_MEMBERS) {
      memberResources.push('members');
    }

    return {
      resources: memberResources,
      organizationId: activeOrg.id,
      organizationName: activeOrg.name,
      placeholder: getSearchPlaceholder(memberResources, activeOrg.name),
      routeMode: 'member' as const,
    };
  }, [isAdmin, isAuthenticated, activeOrg]);
}
