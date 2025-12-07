import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMobileOrgSwitcher } from './useMobileOrgSwitcher';

describe('useMobileOrgSwitcher', () => {
  const mockOrgMemberships: Array<{
    organizationId: string;
    organizationName: string;
    role: 'OrgAdmin' | 'Member';
  }> = [
    { organizationId: 'org-1', organizationName: 'Org 1', role: 'OrgAdmin' },
    { organizationId: 'org-2', organizationName: 'Org 2', role: 'Member' },
  ];

  it('returns undefined organizations when user is platform admin', () => {
    const isGlobalAdmin = vi.fn(() => true);
    const setActiveOrg = vi.fn();
    const navigate = vi.fn();
    const setIsMobileNavOpen = vi.fn();

    const { result } = renderHook(() =>
      useMobileOrgSwitcher({
        orgMemberships: mockOrgMemberships,
        isGlobalAdmin,
        setActiveOrg,
        isAdmin: true,
        navigate,
        setIsMobileNavOpen,
      })
    );

    expect(result.current.mobileOrganizations).toBeUndefined();
  });

  it('returns undefined organizations when user has only one org', () => {
    const isGlobalAdmin = vi.fn(() => false);
    const setActiveOrg = vi.fn();
    const navigate = vi.fn();
    const setIsMobileNavOpen = vi.fn();

    const { result } = renderHook(() =>
      useMobileOrgSwitcher({
        orgMemberships: [mockOrgMemberships[0]],
        isGlobalAdmin,
        setActiveOrg,
        isAdmin: false,
        navigate,
        setIsMobileNavOpen,
      })
    );

    expect(result.current.mobileOrganizations).toBeUndefined();
  });

  it('returns organization list when user has multiple orgs and is not platform admin', () => {
    const isGlobalAdmin = vi.fn(() => false);
    const setActiveOrg = vi.fn();
    const navigate = vi.fn();
    const setIsMobileNavOpen = vi.fn();

    const { result } = renderHook(() =>
      useMobileOrgSwitcher({
        orgMemberships: mockOrgMemberships,
        isGlobalAdmin,
        setActiveOrg,
        isAdmin: false,
        navigate,
        setIsMobileNavOpen,
      })
    );

    expect(result.current.mobileOrganizations).toHaveLength(2);
    expect(result.current.mobileOrganizations).toEqual([
      { id: 'org-1', name: 'Org 1', role: 'OrgAdmin' },
      { id: 'org-2', name: 'Org 2', role: 'Member' },
    ]);
  });

  it('handles org change for OrgAdmin role', () => {
    const isGlobalAdmin = vi.fn(() => false);
    const setActiveOrg = vi.fn();
    const navigate = vi.fn();
    const setIsMobileNavOpen = vi.fn();

    const { result } = renderHook(() =>
      useMobileOrgSwitcher({
        orgMemberships: mockOrgMemberships,
        isGlobalAdmin,
        setActiveOrg,
        isAdmin: false,
        navigate,
        setIsMobileNavOpen,
      })
    );

    result.current.handleMobileOrgChange('org-1');

    expect(setActiveOrg).toHaveBeenCalledWith({
      id: 'org-1',
      name: 'Org 1',
      role: 'OrgAdmin',
    });
    expect(navigate).toHaveBeenCalledWith('/admin/organizations/org-1/edit');
    expect(setIsMobileNavOpen).toHaveBeenCalledWith(false);
  });

  it('handles org change for Member role', () => {
    const isGlobalAdmin = vi.fn(() => false);
    const setActiveOrg = vi.fn();
    const navigate = vi.fn();
    const setIsMobileNavOpen = vi.fn();

    const { result } = renderHook(() =>
      useMobileOrgSwitcher({
        orgMemberships: mockOrgMemberships,
        isGlobalAdmin,
        setActiveOrg,
        isAdmin: false,
        navigate,
        setIsMobileNavOpen,
      })
    );

    result.current.handleMobileOrgChange('org-2');

    expect(setActiveOrg).toHaveBeenCalledWith({
      id: 'org-2',
      name: 'Org 2',
      role: 'Member',
    });
    expect(navigate).toHaveBeenCalledWith('/me/organizations/org-2');
    expect(setIsMobileNavOpen).toHaveBeenCalledWith(false);
  });

  it('navigates platform admin to admin overview regardless of role', () => {
    const isGlobalAdmin = vi.fn(() => false);
    const setActiveOrg = vi.fn();
    const navigate = vi.fn();
    const setIsMobileNavOpen = vi.fn();

    const { result } = renderHook(() =>
      useMobileOrgSwitcher({
        orgMemberships: mockOrgMemberships,
        isGlobalAdmin,
        setActiveOrg,
        isAdmin: true, // Platform admin
        navigate,
        setIsMobileNavOpen,
      })
    );

    // Even if switching to a Member org, platform admin goes to admin overview
    result.current.handleMobileOrgChange('org-2');

    expect(navigate).toHaveBeenCalledWith('/admin/organizations/org-2/edit');
  });

  it('does nothing when org is not found', () => {
    const isGlobalAdmin = vi.fn(() => false);
    const setActiveOrg = vi.fn();
    const navigate = vi.fn();
    const setIsMobileNavOpen = vi.fn();

    const { result } = renderHook(() =>
      useMobileOrgSwitcher({
        orgMemberships: mockOrgMemberships,
        isGlobalAdmin,
        setActiveOrg,
        isAdmin: false,
        navigate,
        setIsMobileNavOpen,
      })
    );

    result.current.handleMobileOrgChange('non-existent-org');

    expect(setActiveOrg).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(setIsMobileNavOpen).not.toHaveBeenCalled();
  });
});
