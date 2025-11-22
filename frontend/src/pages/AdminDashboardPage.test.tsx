import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from './AdminDashboardPage';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

// Mock dependencies
vi.mock('../auth/AuthContext');
vi.mock('../hooks/usePermissions');

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
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
      user: { userId: 'admin-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => true,
      isOrgAdmin: () => true,
      isOrgMember: () => true,
      memberships: [],
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('displays welcome message', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'admin-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => true,
      isOrgAdmin: () => true,
      isOrgMember: () => true,
      memberships: [],
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    expect(screen.getByText(/Welcome to the FanEngagement administration area/i)).toBeInTheDocument();
  });

  it('displays links to admin sections for GlobalAdmin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'admin-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => true,
      isOrgAdmin: () => true,
      isOrgMember: () => true,
      memberships: [],
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Organizations')).toBeInTheDocument();
    expect(screen.getByText('Dev Tools')).toBeInTheDocument();
    
    expect(screen.getByText('Go to Users →')).toBeInTheDocument();
    expect(screen.getByText('Go to Organizations →')).toBeInTheDocument();
    expect(screen.getByText('Go to Dev Tools →')).toBeInTheDocument();
  });

  it('has correct navigation links for GlobalAdmin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'admin-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => true,
      isOrgAdmin: () => true,
      isOrgMember: () => true,
      memberships: [],
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    
    const usersLink = screen.getByText('Go to Users →').closest('a');
    const orgsLink = screen.getByText('Go to Organizations →').closest('a');
    const devToolsLink = screen.getByText('Go to Dev Tools →').closest('a');
    
    expect(usersLink).toHaveAttribute('href', '/admin/users');
    expect(orgsLink).toHaveAttribute('href', '/admin/organizations');
    expect(devToolsLink).toHaveAttribute('href', '/admin/dev-tools');
  });

  it('shows organization list for OrgAdmins', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
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
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token' },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usePermissions).mockReturnValue({
      isGlobalAdmin: () => false,
      isOrgAdmin: () => false,
      isOrgMember: () => false,
      memberships: [],
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    renderAdminDashboard();
    
    expect(screen.getByText(/You don't have administrator permissions/i)).toBeInTheDocument();
  });
});
