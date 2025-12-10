import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { AdminDashboardPage } from './AdminDashboardPage';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveOrganization } from '../contexts/OrgContext';

// Mock dependencies
vi.mock('../auth/AuthContext');
vi.mock('../hooks/usePermissions');
vi.mock('../contexts/OrgContext');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('AdminDashboardPage', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  const renderAdminDashboard = () => {
    return render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
  };

  it('renders admin dashboard heading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'admin-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin',
      mfaRequired: false,
      token: 'token', themePreference: 'Light' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      validateMfa: vi.fn(),
      logout: vi.fn(),
      setUserThemePreference: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => true,
      isOrgAdmin: () => true,
      isOrgMember: () => true,
      memberships: [],
      isLoading: false,
      hasAnyOrgAdminRole: () => false,
      canAccessAdminArea: () => false,
      refreshMemberships: vi.fn(),
    });
    vi.mocked(useActiveOrganization).mockReturnValue({
      activeOrg: null,
      setActiveOrg: vi.fn(),
      memberships: [],
      hasMultipleOrgs: false,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('displays welcome message', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'admin-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin',
      mfaRequired: false,
      token: 'token', themePreference: 'Light' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      validateMfa: vi.fn(),
      logout: vi.fn(),
      setUserThemePreference: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => true,
      isOrgAdmin: () => true,
      isOrgMember: () => true,
      memberships: [],
      isLoading: false,
      hasAnyOrgAdminRole: () => false,
      canAccessAdminArea: () => false,
      refreshMemberships: vi.fn(),
    });
    vi.mocked(useActiveOrganization).mockReturnValue({
      activeOrg: null,
      setActiveOrg: vi.fn(),
      memberships: [],
      hasMultipleOrgs: false,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    expect(screen.getByText(/Welcome to the FanEngagement administration area/i)).toBeInTheDocument();
  });

  it('displays links to admin sections for GlobalAdmin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'admin-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin',
      mfaRequired: false,
      token: 'token', themePreference: 'Light' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      validateMfa: vi.fn(),
      logout: vi.fn(),
      setUserThemePreference: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => true,
      isOrgAdmin: () => true,
      isOrgMember: () => true,
      memberships: [],
      isLoading: false,
      hasAnyOrgAdminRole: () => false,
      canAccessAdminArea: () => false,
      refreshMemberships: vi.fn(),
    });
    vi.mocked(useActiveOrganization).mockReturnValue({
      activeOrg: null,
      setActiveOrg: vi.fn(),
      memberships: [],
      hasMultipleOrgs: false,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Organizations')).toBeInTheDocument();
    expect(screen.getByText('Dev Tools')).toBeInTheDocument();
    
    expect(screen.getByRole('link', { name: 'Go to Users' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Organizations' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Dev Tools' })).toBeInTheDocument();
  });

  it('has correct navigation links for GlobalAdmin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'admin-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin',
      mfaRequired: false,
      token: 'token', themePreference: 'Light' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      validateMfa: vi.fn(),
      logout: vi.fn(),
      setUserThemePreference: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => true,
      isOrgAdmin: () => true,
      isOrgMember: () => true,
      memberships: [],
      isLoading: false,
      hasAnyOrgAdminRole: () => false,
      canAccessAdminArea: () => false,
      refreshMemberships: vi.fn(),
    });
    vi.mocked(useActiveOrganization).mockReturnValue({
      activeOrg: null,
      setActiveOrg: vi.fn(),
      memberships: [],
      hasMultipleOrgs: false,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    
    const usersLink = screen.getByRole('link', { name: 'Go to Users' });
    const orgsLink = screen.getByRole('link', { name: 'Go to Organizations' });
    const devToolsLink = screen.getByRole('link', { name: 'Go to Dev Tools' });
    
    expect(usersLink).toHaveAttribute('href', '/admin/users');
    expect(orgsLink).toHaveAttribute('href', '/admin/organizations');
    expect(devToolsLink).toHaveAttribute('href', '/admin/dev-tools');
  });

  it('shows organization list for OrgAdmins', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User',
      mfaRequired: false,
      token: 'token', themePreference: 'Light' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      validateMfa: vi.fn(),
      logout: vi.fn(),
      setUserThemePreference: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => false,
      isOrgAdmin: (orgId: string) => orgId === 'org-1',
      isOrgMember: () => false,
      memberships: [{
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Test Organization',
        userId: 'user-1',
        role: 'OrgAdmin',
        createdAt: '2024-01-01T00:00:00Z',
      }],
      isLoading: false,
      hasAnyOrgAdminRole: () => false,
      canAccessAdminArea: () => false,
      refreshMemberships: vi.fn(),
    });
    vi.mocked(useActiveOrganization).mockReturnValue({
      activeOrg: null,
      setActiveOrg: vi.fn(),
      memberships: [{
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Test Organization',
        userId: 'user-1',
        role: 'OrgAdmin',
        createdAt: '2024-01-01T00:00:00Z',
      }],
      hasMultipleOrgs: false,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    
    expect(screen.getByText('Your Organizations')).toBeInTheDocument();
    expect(screen.getByText('Test Organization')).toBeInTheDocument();
    expect(screen.getByText('Edit Organization')).toBeInTheDocument();
    expect(screen.getByText('Manage Members')).toBeInTheDocument();
  });

  it('shows no access message for non-admin users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User',
      mfaRequired: false,
      token: 'token', themePreference: 'Light' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      validateMfa: vi.fn(),
      logout: vi.fn(),
      setUserThemePreference: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => false,
      isOrgAdmin: () => false,
      isOrgMember: () => false,
      memberships: [],
      isLoading: false,
      hasAnyOrgAdminRole: () => false,
      canAccessAdminArea: () => false,
      refreshMemberships: vi.fn(),
    });
    vi.mocked(useActiveOrganization).mockReturnValue({
      activeOrg: null,
      setActiveOrg: vi.fn(),
      memberships: [],
      hasMultipleOrgs: false,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    
    expect(screen.getByText(/You don't have administrator permissions/i)).toBeInTheDocument();
  });

  it('redirects to member dashboard when active org is member-only', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User',
      mfaRequired: false,
      token: 'token', themePreference: 'Light' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      validateMfa: vi.fn(),
      logout: vi.fn(),
      setUserThemePreference: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => false,
      isOrgAdmin: () => false,
      isOrgMember: (orgId: string) => orgId === 'org-member-only',
      memberships: [{
        id: 'membership-1',
        organizationId: 'org-member-only',
        organizationName: 'Member Only Org',
        userId: 'user-1',
        role: 'Member',
        createdAt: '2024-01-01T00:00:00Z',
      }],
      isLoading: false,
      hasAnyOrgAdminRole: () => false,
      canAccessAdminArea: () => false,
      refreshMemberships: vi.fn(),
    });
    vi.mocked(useActiveOrganization).mockReturnValue({
      activeOrg: {
        id: 'org-member-only',
        name: 'Member Only Org',
        role: 'Member',
      },
      setActiveOrg: vi.fn(),
      memberships: [{
        id: 'membership-1',
        organizationId: 'org-member-only',
        organizationName: 'Member Only Org',
        userId: 'user-1',
        role: 'Member',
        createdAt: '2024-01-01T00:00:00Z',
      }],
      hasMultipleOrgs: false,
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    const { container } = renderAdminDashboard();
    
    // Verify navigate was called with correct arguments
    expect(mockNavigate).toHaveBeenCalledWith('/me/organizations/org-member-only', { replace: true });
    
    // Verify component returns null during redirect
    expect(container.firstChild).toBeNull();
  });

  it('does not redirect when memberships are still loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User',
      mfaRequired: false,
      token: 'token', themePreference: 'Light' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      validateMfa: vi.fn(),
      logout: vi.fn(),
      setUserThemePreference: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => false,
      isOrgAdmin: () => false,
      isOrgMember: (orgId: string) => orgId === 'org-member-only',
      memberships: [], // Empty while loading
      isLoading: true, // Still loading
      hasAnyOrgAdminRole: () => false,
      canAccessAdminArea: () => false,
      refreshMemberships: vi.fn(),
    });
    vi.mocked(useActiveOrganization).mockReturnValue({
      activeOrg: {
        id: 'org-member-only',
        name: 'Member Only Org',
        role: 'Member',
      },
      setActiveOrg: vi.fn(),
      memberships: [],
      hasMultipleOrgs: false,
      isLoading: true,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    
    // Verify navigate was NOT called while loading
    expect(mockNavigate).not.toHaveBeenCalled();
    
    // Component should still render (not return null) while loading
    expect(screen.getByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
  });
});
