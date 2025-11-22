import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePermissions } from './usePermissions';
import { useAuth } from '../auth/AuthContext';
import { membershipsApi } from '../api/membershipsApi';
import type { MembershipWithOrganizationDto } from '../types/api';

// Mock dependencies
vi.mock('../auth/AuthContext');
vi.mock('../api/membershipsApi');

describe('usePermissions', () => {
  const mockMemberships: MembershipWithOrganizationDto[] = [
    {
      id: 'membership-1',
      organizationId: 'org-1',
      organizationName: 'Organization 1',
      userId: 'user-1',
      role: 'OrgAdmin',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'membership-2',
      organizationId: 'org-2',
      organizationName: 'Organization 2',
      userId: 'user-1',
      role: 'Member',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return isGlobalAdmin as true for Admin users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isGlobalAdmin()).toBe(true);
  });

  it('should return isGlobalAdmin as false for non-Admin users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isGlobalAdmin()).toBe(false);
  });

  it('should return isOrgAdmin as true for GlobalAdmins regardless of membership', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'admin-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isOrgAdmin('any-org-id')).toBe(true);
  });

  it('should return isOrgAdmin as true when user has OrgAdmin role for organization', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isOrgAdmin('org-1')).toBe(true);
  });

  it('should return isOrgAdmin as false when user has Member role for organization', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isOrgAdmin('org-2')).toBe(false);
  });

  it('should return isOrgAdmin as false when user has no membership', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isOrgAdmin('org-3')).toBe(false);
  });

  it('should return isOrgMember as true for GlobalAdmins regardless of membership', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'admin-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isOrgMember('any-org-id')).toBe(true);
  });

  it('should return isOrgMember as true when user has any membership', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isOrgMember('org-1')).toBe(true);
    expect(result.current.isOrgMember('org-2')).toBe(true);
  });

  it('should return isOrgMember as false when user has no membership', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isOrgMember('org-3')).toBe(false);
  });

  it('should fetch memberships on mount', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(membershipsApi.getByUserId).toHaveBeenCalledWith('user-1');
    expect(result.current.memberships).toEqual(mockMemberships);
  });

  it('should handle membership fetch errors gracefully', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockRejectedValue(new Error('Network error'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.memberships).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch memberships:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('should not fetch memberships when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderHook(() => usePermissions());

    expect(membershipsApi.getByUserId).not.toHaveBeenCalled();
  });

  it('should allow manual refresh of memberships', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(membershipsApi.getByUserId).toHaveBeenCalledTimes(1);

    await result.current.refreshMemberships();

    expect(membershipsApi.getByUserId).toHaveBeenCalledTimes(2);
  });
});
