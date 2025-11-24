import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { OrgProvider, useActiveOrganization } from './OrgContext';
import { membershipsApi } from '../api/membershipsApi';
import type { MembershipWithOrganizationDto } from '../types/api';

vi.mock('../api/membershipsApi');

describe('OrgContext', () => {
  const mockMemberships: MembershipWithOrganizationDto[] = [
    {
      id: 'membership-1',
      organizationId: 'org-1',
      organizationName: 'Organization One',
      userId: 'user-1',
      role: 'OrgAdmin',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'membership-2',
      organizationId: 'org-2',
      organizationName: 'Organization Two',
      userId: 'user-1',
      role: 'Member',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('fetches memberships when authenticated', async () => {
    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrgProvider isAuthenticated={true}>{children}</OrgProvider>
    );

    const { result } = renderHook(() => useActiveOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.memberships).toEqual(mockMemberships);
    expect(result.current.hasMultipleOrgs).toBe(true);
    expect(membershipsApi.getMyOrganizations).toHaveBeenCalledTimes(1);
  });

  it('auto-selects first organization when user has single org', async () => {
    const singleMembership = [mockMemberships[0]];
    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(singleMembership);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrgProvider isAuthenticated={true}>{children}</OrgProvider>
    );

    const { result } = renderHook(() => useActiveOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeOrg).toEqual({
      id: 'org-1',
      name: 'Organization One',
      role: 'OrgAdmin',
    });
    expect(result.current.hasMultipleOrgs).toBe(false);
  });

  it('auto-selects first organization when user has multiple orgs and no stored selection', async () => {
    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrgProvider isAuthenticated={true}>{children}</OrgProvider>
    );

    const { result } = renderHook(() => useActiveOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeOrg).toEqual({
      id: 'org-1',
      name: 'Organization One',
      role: 'OrgAdmin',
    });
    expect(result.current.hasMultipleOrgs).toBe(true);
  });

  it('persists active organization to localStorage', async () => {
    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrgProvider isAuthenticated={true}>{children}</OrgProvider>
    );

    const { result } = renderHook(() => useActiveOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const stored = localStorage.getItem('activeOrganization');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.id).toBe('org-1');
    expect(parsed.name).toBe('Organization One');
  });

  it('restores active organization from localStorage', async () => {
    const storedOrg = {
      id: 'org-2',
      name: 'Organization Two',
      role: 'Member' as const,
    };
    localStorage.setItem('activeOrganization', JSON.stringify(storedOrg));

    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrgProvider isAuthenticated={true}>{children}</OrgProvider>
    );

    const { result } = renderHook(() => useActiveOrganization(), { wrapper });

    // Should start with stored org
    expect(result.current.activeOrg?.id).toBe('org-2');

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should still have org-2 after loading (since it's in memberships)
    expect(result.current.activeOrg?.id).toBe('org-2');
    expect(result.current.activeOrg?.name).toBe('Organization Two');
  });

  it('allows manual organization switching', async () => {
    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrgProvider isAuthenticated={true}>{children}</OrgProvider>
    );

    const { result } = renderHook(() => useActiveOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Switch to org-2
    const newOrg = {
      id: 'org-2',
      name: 'Organization Two',
      role: 'Member' as const,
    };
    
    await waitFor(() => {
      result.current.setActiveOrg(newOrg);
    });

    await waitFor(() => {
      expect(result.current.activeOrg).toEqual(newOrg);
    });

    // Verify it's persisted
    const stored = localStorage.getItem('activeOrganization');
    const parsed = JSON.parse(stored!);
    expect(parsed.id).toBe('org-2');
  });

  it('clears active organization when not authenticated', async () => {
    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrgProvider isAuthenticated={false}>{children}</OrgProvider>
    );

    const { result } = renderHook(() => useActiveOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeOrg).toBeNull();
    expect(result.current.memberships).toEqual([]);
    expect(membershipsApi.getMyOrganizations).not.toHaveBeenCalled();
  });

  it('clears stored org if no longer in memberships', async () => {
    const storedOrg = {
      id: 'org-999',
      name: 'Deleted Org',
      role: 'Member' as const,
    };
    localStorage.setItem('activeOrganization', JSON.stringify(storedOrg));

    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrgProvider isAuthenticated={true}>{children}</OrgProvider>
    );

    const { result } = renderHook(() => useActiveOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should default to first org since stored org is not in memberships
    expect(result.current.activeOrg?.id).toBe('org-1');
  });

  it('throws error when used outside OrgProvider', () => {
    expect(() => {
      renderHook(() => useActiveOrganization());
    }).toThrow('useActiveOrganization must be used within an OrgProvider');
  });
});
