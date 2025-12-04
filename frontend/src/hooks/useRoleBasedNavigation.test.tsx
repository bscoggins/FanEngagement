import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { useRoleBasedNavigation } from './useRoleBasedNavigation';
import { membershipsApi } from '../api/membershipsApi';

// Mock the membershipsApi
vi.mock('../api/membershipsApi', () => ({
  membershipsApi: {
    getByUserId: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('useRoleBasedNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );

  it('navigates admin users to /platform-admin/dashboard without fetching memberships', async () => {
    const adminUser = {
      token: 'admin-token',
      userId: 'admin-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin' as const,
      mfaRequired: false,
    };

    const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper });

    await result.current.navigateToDefaultRoute(adminUser);

    expect(mockNavigate).toHaveBeenCalledWith('/platform-admin/dashboard', undefined);
    expect(membershipsApi.getByUserId).not.toHaveBeenCalled();
  });

  it('navigates OrgAdmin users to /admin after fetching memberships', async () => {
    const orgAdminUser = {
      token: 'user-token',
      userId: 'orgadmin-123',
      email: 'orgadmin@example.com',
      displayName: 'OrgAdmin User',
      role: 'User' as const,
      mfaRequired: false,
    };

    const mockMemberships = [
      {
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Test Org',
        userId: 'orgadmin-123',
        role: 'OrgAdmin' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];
    vi.mocked(membershipsApi.getByUserId).mockResolvedValueOnce(mockMemberships);

    const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper });

    await result.current.navigateToDefaultRoute(orgAdminUser);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin', undefined);
    });
    expect(membershipsApi.getByUserId).toHaveBeenCalledWith('orgadmin-123');
  });

  it('navigates regular members to /me/home', async () => {
    const regularUser = {
      token: 'user-token',
      userId: 'member-123',
      email: 'member@example.com',
      displayName: 'Regular Member',
      role: 'User' as const,
      mfaRequired: false,
    };

    vi.mocked(membershipsApi.getByUserId).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper });

    await result.current.navigateToDefaultRoute(regularUser);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/me/home', undefined);
    });
  });

  it('respects replace option', async () => {
    const adminUser = {
      token: 'admin-token',
      userId: 'admin-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin' as const,
      mfaRequired: false,
    };

    const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper });

    await result.current.navigateToDefaultRoute(adminUser, { replace: true });

    expect(mockNavigate).toHaveBeenCalledWith('/platform-admin/dashboard', { replace: true });
  });

  it('falls back to /me/home on API error', async () => {
    const regularUser = {
      token: 'user-token',
      userId: 'member-123',
      email: 'member@example.com',
      displayName: 'Regular Member',
      role: 'User' as const,
      mfaRequired: false,
    };

    vi.mocked(membershipsApi.getByUserId).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useRoleBasedNavigation(), { wrapper });

    await result.current.navigateToDefaultRoute(regularUser);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/me/home', undefined);
    });
  });
});
