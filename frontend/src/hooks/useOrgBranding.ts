import { useState, useEffect } from 'react';
import { organizationsApi } from '../api/organizationsApi';

export interface OrgBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  isLoading: boolean;
  error?: string;
}

export const DEFAULT_PRIMARY_COLOR = '#0066cc';
export const DEFAULT_SECONDARY_COLOR = '#6c757d';

/**
 * Hook to fetch and provide organization branding information.
 * Returns branding with defaults if not set.
 * 
 * @param orgId - The organization ID to fetch branding for
 * @returns OrgBranding object with logo, colors, loading state, and error
 */
export function useOrgBranding(orgId?: string): OrgBranding {
  const [branding, setBranding] = useState<OrgBranding>({
    primaryColor: DEFAULT_PRIMARY_COLOR,
    secondaryColor: DEFAULT_SECONDARY_COLOR,
    isLoading: true,
  });

  useEffect(() => {
    if (!orgId) {
      setBranding({
        primaryColor: DEFAULT_PRIMARY_COLOR,
        secondaryColor: DEFAULT_SECONDARY_COLOR,
        isLoading: false,
      });
      return;
    }

    let isMounted = true;

    const fetchBranding = async () => {
      try {
        const org = await organizationsApi.getById(orgId);
        
        if (isMounted) {
          setBranding({
            logoUrl: org.logoUrl,
            primaryColor: org.primaryColor || DEFAULT_PRIMARY_COLOR,
            secondaryColor: org.secondaryColor || DEFAULT_SECONDARY_COLOR,
            isLoading: false,
          });
        }
      } catch (err) {
        console.error('Failed to fetch organization branding:', err);
        if (isMounted) {
          setBranding({
            primaryColor: DEFAULT_PRIMARY_COLOR,
            secondaryColor: DEFAULT_SECONDARY_COLOR,
            isLoading: false,
            error: 'Failed to load branding',
          });
        }
      }
    };

    fetchBranding();

    return () => {
      isMounted = false;
    };
  }, [orgId]);

  return branding;
}
