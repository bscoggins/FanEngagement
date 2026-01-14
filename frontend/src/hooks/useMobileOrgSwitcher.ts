import { useMemo, useCallback } from 'react';
import type { MobileNavOrganization } from '../components/MobileNav';

interface UseMobileOrgSwitcherParams {
  orgMemberships: Array<{
    organizationId: string;
    organizationName: string;
    role: 'OrgAdmin' | 'Member';
  }>;
  isGlobalAdmin: () => boolean;
  setActiveOrg: (org: { id: string; name: string; role: 'OrgAdmin' | 'Member' } | null) => void;
  isAdmin: boolean;
  navigate: (path: string) => void;
  setIsMobileNavOpen: (open: boolean) => void;
}

interface UseMobileOrgSwitcherReturn {
  mobileOrganizations: MobileNavOrganization[] | undefined;
  handleMobileOrgChange: (orgId: string) => void;
}

/**
 * Custom hook to manage mobile organization switcher logic.
 * Provides organization data and change handler for mobile navigation drawer.
 * 
 * @param params - Configuration parameters
 * @returns Mobile organizations list and change handler
 */
export function useMobileOrgSwitcher({
  orgMemberships,
  isGlobalAdmin,
  setActiveOrg,
  isAdmin,
  navigate,
  setIsMobileNavOpen,
}: UseMobileOrgSwitcherParams): UseMobileOrgSwitcherReturn {
  // Prepare mobile org data - only for non-platform admins with multiple orgs
  const mobileOrganizations: MobileNavOrganization[] | undefined = useMemo(() => {
    if (isGlobalAdmin() || orgMemberships.length <= 1) {
      return undefined;
    }
    
    return orgMemberships.map(m => ({
      id: m.organizationId,
      name: m.organizationName,
      role: m.role,
    }));
  }, [isGlobalAdmin, orgMemberships]);

  const handleMobileOrgChange = useCallback((orgId: string) => {
    const membership = orgMemberships.find(m => m.organizationId === orgId);
    if (membership) {
      setActiveOrg({
        id: membership.organizationId,
        name: membership.organizationName,
        role: membership.role,
      });

      // Navigate based on role: OrgAdmin/platform admin → admin dashboard, else member view
      if (isAdmin || membership.role === 'OrgAdmin') {
        navigate(`/admin/organizations/${membership.organizationId}`);
      } else {
        navigate(`/me/organizations/${membership.organizationId}`);
      }
      
      // Close the mobile nav after org change
      setIsMobileNavOpen(false);
    }
  }, [orgMemberships, setActiveOrg, isAdmin, navigate, setIsMobileNavOpen]);

  return { mobileOrganizations, handleMobileOrgChange };
}
