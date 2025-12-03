import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { OrgProvider } from '../contexts/OrgContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { AdminLayout } from './AdminLayout';
import { membershipsApi } from '../api/membershipsApi';
import type { MembershipWithOrganizationDto } from '../types/api';

// Mock the membershipsApi
vi.mock('../api/membershipsApi');

describe('AdminLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderAdminLayout = (
    initialRoute = '/admin',
    options: {
      role?: 'Admin' | 'User';
      mockMemberships?: MembershipWithOrganizationDto[];
    } = {}
  ) => {
    const { role = 'Admin', mockMemberships = [] } = options;
    
    // Set up auth state for admin user
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'test-token',
      userId: 'user-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role,
    }));

    // Mock memberships API responses
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <NotificationProvider>
          <AuthProvider>
            <OrgProvider isAuthenticated={true}>
              <Routes>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<div>Dashboard Content</div>} />
                  <Route path="users" element={<div>Users Content</div>} />
                  <Route path="organizations" element={<div>Organizations Content</div>} />
                  <Route path="organizations/:orgId/edit" element={<div>Org Edit Content</div>} />
                  <Route path="organizations/:orgId/memberships" element={<div>Memberships Content</div>} />
                  <Route path="dev-tools" element={<div>Dev Tools Content</div>} />
                </Route>
                <Route path="/" element={<div>Home Page</div>} />
                <Route path="/me/home" element={<div>Member Home Page</div>} />
                <Route path="/platform-admin/dashboard" element={<div>Platform Admin Dashboard</div>} />
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
            </OrgProvider>
          </AuthProvider>
        </NotificationProvider>
      </MemoryRouter>
    );
  };

  it('renders admin header with title', () => {
    renderAdminLayout();
    expect(screen.getByText('FanEngagement Admin')).toBeInTheDocument();
  });

  it('displays logout button', () => {
    renderAdminLayout();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('displays sidebar navigation links for platform admin', async () => {
    renderAdminLayout();
    
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Organizations')).toBeInTheDocument();
      expect(screen.getByText('Dev Tools')).toBeInTheDocument();
    });
  });

  it('displays home link instead of back to main app', async () => {
    renderAdminLayout();
    
    await waitFor(() => {
      const homeLink = screen.getByText('← Home');
      expect(homeLink).toBeInTheDocument();
      // Platform admin home route
      expect(homeLink.closest('a')).toHaveAttribute('href', '/platform-admin/dashboard');
    });
  });

  it('renders child content in main area', () => {
    renderAdminLayout('/admin');
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('navigates to users page when users link is clicked', async () => {
    renderAdminLayout('/admin');
    const user = userEvent.setup();
    
    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });
    
    const usersLink = screen.getByText('Users').closest('a');
    expect(usersLink).toHaveAttribute('href', '/admin/users');
    
    await user.click(usersLink!);
    
    await waitFor(() => {
      expect(screen.getByText('Users Content')).toBeInTheDocument();
    });
  });

  it('has correct navigation link hrefs for platform admin', async () => {
    renderAdminLayout();
    
    await waitFor(() => {
      const dashboardLink = screen.getByText('Admin Dashboard').closest('a');
      const usersLink = screen.getByText('Users').closest('a');
      const orgsLink = screen.getByText('Organizations').closest('a');
      const devToolsLink = screen.getByText('Dev Tools').closest('a');
      
      expect(dashboardLink).toHaveAttribute('href', '/admin');
      expect(usersLink).toHaveAttribute('href', '/admin/users');
      expect(orgsLink).toHaveAttribute('href', '/admin/organizations');
      expect(devToolsLink).toHaveAttribute('href', '/admin/dev-tools');
    });
  });

  it('handles logout button click', async () => {
    renderAdminLayout();
    const user = userEvent.setup();
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);
    
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('handles auth:logout event from API client', async () => {
    renderAdminLayout();
    
    // Dispatch the auth:logout event (simulating a 401 from the API)
    window.dispatchEvent(new CustomEvent('auth:logout'));
    
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    
    // Verify localStorage was cleared
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authUser')).toBeNull();
  });

  describe('OrgAdmin navigation', () => {
    it('displays only admin dashboard for org admin without active org', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Test Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      
      // When org is NOT set as active yet (initial state)
      localStorage.removeItem('activeOrganization');
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships,
      });

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
      
      // Should NOT see platform admin items
      expect(screen.queryByText('Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Organizations')).not.toBeInTheDocument();
      expect(screen.queryByText('Dev Tools')).not.toBeInTheDocument();
    });

    it('displays org-scoped items when org is active', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Test Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      
      // Set active org
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-1',
        name: 'Test Org',
        role: 'OrgAdmin',
      }));
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships,
      });

      await waitFor(() => {
        // Should see org-scoped navigation items (uses new labels)
        expect(screen.getByText('Memberships')).toBeInTheDocument();
        expect(screen.getByText('Share Types')).toBeInTheDocument();
        expect(screen.getByText('Proposals')).toBeInTheDocument();
        expect(screen.getByText('Webhook Events')).toBeInTheDocument();
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });
      
      // Should see org admin dashboard
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      
      // Should see org switcher with org name in header
      expect(screen.getByTestId('admin-header-org-selector')).toBeInTheDocument();
      // The org name appears in the dropdown option
      expect(screen.getByRole('option', { name: /Test Org/ })).toBeInTheDocument();
      
      // Should see "Org Admin" badge in header
      expect(screen.getByTestId('org-admin-badge')).toBeInTheDocument();
      expect(screen.getByTestId('org-admin-badge')).toHaveTextContent('Org Admin');
    });

    it('home link navigates to admin for org admin', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Test Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships,
      });

      await waitFor(() => {
        const homeLink = screen.getByText('← Home');
        expect(homeLink).toBeInTheDocument();
        // OrgAdmin home route
        expect(homeLink.closest('a')).toHaveAttribute('href', '/admin');
      });
    });
  });

  describe('Mixed-role user navigation', () => {
    it('displays all organizations in the switcher for mixed-role users', async () => {
      const mixedRoleMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-admin-org',
          organizationName: 'Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'membership-2',
          organizationId: 'org-member-org',
          organizationName: 'Member Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      
      // Set active org as admin org
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-admin-org',
        name: 'Admin Org',
        role: 'OrgAdmin',
      }));
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships: mixedRoleMemberships,
      });

      await waitFor(() => {
        const orgSelector = screen.getByTestId('admin-header-org-selector');
        expect(orgSelector).toBeInTheDocument();
        
        // Both orgs should be in the dropdown (without role suffix now)
        expect(screen.getByRole('option', { name: /Admin Org/ })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Member Org/ })).toBeInTheDocument();
      });
    });

    it('shows org admin nav items when admin org is selected', async () => {
      const mixedRoleMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-admin-org',
          organizationName: 'Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'membership-2',
          organizationId: 'org-member-org',
          organizationName: 'Member Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      
      // Set active org as admin org
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-admin-org',
        name: 'Admin Org',
        role: 'OrgAdmin',
      }));
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships: mixedRoleMemberships,
      });

      await waitFor(() => {
        // Should see org admin nav items for admin org
        expect(screen.getByTestId('org-nav-orgOverview')).toBeInTheDocument();
        expect(screen.getByTestId('org-nav-manageMemberships')).toBeInTheDocument();
        expect(screen.getByTestId('org-nav-manageShareTypes')).toBeInTheDocument();
        expect(screen.getByTestId('org-nav-manageProposals')).toBeInTheDocument();
        expect(screen.getByTestId('org-nav-webhookEvents')).toBeInTheDocument();
        
        // Should show "Org Admin" badge in header
        expect(screen.getByTestId('org-admin-badge')).toBeInTheDocument();
        expect(screen.getByTestId('org-admin-badge')).toHaveTextContent('Org Admin');
      });
    });

    it('hides org admin nav items when member-only org is selected', async () => {
      const mixedRoleMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-admin-org',
          organizationName: 'Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'membership-2',
          organizationId: 'org-member-org',
          organizationName: 'Member Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      
      // Set active org as member-only org
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-member-org',
        name: 'Member Org',
        role: 'Member',
      }));
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships: mixedRoleMemberships,
      });

      await waitFor(() => {
        // Should NOT see org admin nav items
        expect(screen.queryByTestId('org-nav-orgOverview')).not.toBeInTheDocument();
        expect(screen.queryByTestId('org-nav-manageMemberships')).not.toBeInTheDocument();
        
        // Should NOT show "Org Admin" badge in header (member role doesn't get badge)
        expect(screen.queryByTestId('org-admin-badge')).not.toBeInTheDocument();
        
        // Should show link to view organization as member
        expect(screen.getByText('View organization →')).toBeInTheDocument();
      });
    });

    it('navigates to member home when switching to a member org', async () => {
      const user = userEvent.setup();
      const mixedRoleMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-admin',
          organizationName: 'Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'membership-2',
          organizationId: 'org-member',
          organizationName: 'Member Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships: mixedRoleMemberships,
      });

      await waitFor(() => {
        expect(screen.getByTestId('admin-header-org-selector')).toBeInTheDocument();
      });

      const selector = screen.getByTestId('admin-header-org-selector');
      
      // Switch to the member org
      await user.selectOptions(selector, 'org-member');

      // Should navigate to member home, not org detail page
      await waitFor(() => {
        expect(screen.getByText('Member Home Page')).toBeInTheDocument();
      });
    });

    it('navigates to admin org page when switching to an admin org', async () => {
      const user = userEvent.setup();
      const mixedRoleMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-admin',
          organizationName: 'Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'membership-2',
          organizationId: 'org-member',
          organizationName: 'Member Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships: mixedRoleMemberships,
      });

      await waitFor(() => {
        expect(screen.getByTestId('admin-header-org-selector')).toBeInTheDocument();
      });

      const selector = screen.getByTestId('admin-header-org-selector');
      
      // Switch to the admin org
      await user.selectOptions(selector, 'org-admin');

      // Should navigate to admin org edit page
      await waitFor(() => {
        expect(screen.getByText('Org Edit Content')).toBeInTheDocument();
      });
    });
  });
});
