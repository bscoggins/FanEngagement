import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { membershipsApi } from '../api/membershipsApi';
import type { MembershipWithOrganizationDto } from '../types/api';

interface ActiveOrganization {
  id: string;
  name: string;
  role: 'OrgAdmin' | 'Member';
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface OrgContextType {
  activeOrg: ActiveOrganization | null;
  setActiveOrg: (org: ActiveOrganization | null) => void;
  memberships: MembershipWithOrganizationDto[];
  hasMultipleOrgs: boolean;
  isLoading: boolean;
  refreshMemberships: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

const ACTIVE_ORG_KEY = 'activeOrganization';

// Helper function to load active org from localStorage
const loadActiveOrgFromStorage = (): ActiveOrganization | null => {
  const stored = localStorage.getItem(ACTIVE_ORG_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Validate the structure of the parsed data
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.id === 'string' &&
        typeof parsed.name === 'string' &&
        (parsed.role === 'OrgAdmin' || parsed.role === 'Member')
      ) {
        return parsed as ActiveOrganization;
      } else {
        console.warn('Invalid stored organization data structure, clearing...');
        localStorage.removeItem(ACTIVE_ORG_KEY);
      }
    } catch (error) {
      console.error('Failed to parse stored active organization:', error);
      localStorage.removeItem(ACTIVE_ORG_KEY);
    }
  }
  return null;
};

// Helper function to save active org to localStorage
const saveActiveOrgToStorage = (org: ActiveOrganization | null) => {
  if (org) {
    localStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(org));
  } else {
    localStorage.removeItem(ACTIVE_ORG_KEY);
  }
};

export const OrgProvider: React.FC<{ children: ReactNode; isAuthenticated: boolean }> = ({ 
  children, 
  isAuthenticated 
}) => {
  const [activeOrg, setActiveOrgState] = useState<ActiveOrganization | null>(() => {
    return loadActiveOrgFromStorage();
  });
  const [memberships, setMemberships] = useState<MembershipWithOrganizationDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMemberships = useCallback(async (signal?: AbortSignal) => {
    if (!isAuthenticated) {
      setMemberships([]);
      setActiveOrgState(null);
      saveActiveOrgToStorage(null);
      return;
    }

    try {
      setIsLoading(true);
      const data = await membershipsApi.getMyOrganizations();
      
      if (!signal?.aborted) {
        setMemberships(data);

        // Auto-select organization if needed
        if (data.length > 0) {
          const storedOrg = loadActiveOrgFromStorage();
          
          // If no org is selected or the stored org is no longer in memberships, select one
          if (!storedOrg || !data.find(m => m.organizationId === storedOrg.id)) {
            // Default to the first organization
            const firstMembership = data[0];
            const newActiveOrg: ActiveOrganization = {
              id: firstMembership.organizationId,
              name: firstMembership.organizationName,
              role: firstMembership.role,
            };
            setActiveOrgState(newActiveOrg);
            saveActiveOrgToStorage(newActiveOrg);
          } else if (storedOrg) {
            // Update stored org with latest membership data
            const currentMembership = data.find(m => m.organizationId === storedOrg.id);
            if (currentMembership) {
              const updatedOrg: ActiveOrganization = {
                ...storedOrg,
                name: currentMembership.organizationName,
                role: currentMembership.role,
              };
              setActiveOrgState(updatedOrg);
              saveActiveOrgToStorage(updatedOrg);
            }
          }
        } else {
          // No memberships - clear active org
          setActiveOrgState(null);
          saveActiveOrgToStorage(null);
        }
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
  }, [isAuthenticated]);

  // Fetch memberships when auth state changes
  useEffect(() => {
    const abortController = new AbortController();
    fetchMemberships(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [fetchMemberships]);

  const setActiveOrg = useCallback((org: ActiveOrganization | null) => {
    setActiveOrgState(org);
    saveActiveOrgToStorage(org);
  }, []);

  const value: OrgContextType = {
    activeOrg,
    setActiveOrg,
    memberships,
    hasMultipleOrgs: memberships.length > 1,
    isLoading,
    refreshMemberships: () => fetchMemberships(),
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
};

export const useActiveOrganization = () => {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useActiveOrganization must be used within an OrgProvider');
  }
  return context;
};
