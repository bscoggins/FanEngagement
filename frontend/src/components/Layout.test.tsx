import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { OrgProvider } from '../contexts/OrgContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { Layout } from './Layout';
import { membershipsApi } from '../api/membershipsApi';
import type { MembershipWithOrganizationDto } from '../types/api';

// Mock the memberships API
vi.mock('../api/membershipsApi');

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderLayout = (
    authState: {
      isAuthenticated: boolean;
      role: 'User' | 'Admin';
      email?: string;
    },
    mockMemberships: MembershipWithOrganizationDto[] = []
  ) => {
    if (authState.isAuthenticated) {
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('authUser', JSON.stringify({
        token: 'test-token',
        userId: 'user-123',
        email: authState.email || 'user@example.com',
        displayName: 'Test User',
        role: authState.role,
      }));
    }

    // Mock memberships API responses
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

    return render(
      <MemoryRouter initialEntries={['/']}>
        <NotificationProvider>
          <AuthProvider>
            <OrgProvider isAuthenticated={authState.isAuthenticated}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<div>Home Content</div>} />
                </Route>
                <Route path="/me" element={<div>My Account Page</div>} />
                <Route path="/me/organizations" element={<div>My Organizations Page</div>} />
                <Route path="/users" element={<div>Users Page</div>} />
                <Route path="/admin" element={<div>Admin Page</div>} />
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
            </OrgProvider>
          </AuthProvider>
        </NotificationProvider>
      </MemoryRouter>
    );
  };

  describe('Navigation visibility for unauthenticated users', () => {
    it('shows only Login link when not authenticated', () => {
      renderLayout({ isAuthenticated: false, role: 'User' });

      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /my account/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /my organizations/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
      expect(screen.queryByTestId('unified-sidebar')).not.toBeInTheDocument();
    });
  });

  describe('Navigation visibility for regular members', () => {
    it('shows only My Account and My Organizations for a regular member', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Test Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      renderLayout({ isAuthenticated: true, role: 'User', email: 'alice@example.com' }, mockMemberships);

      // Wait for permissions to load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Should see sidebar with My Account and My Organizations
      expect(screen.getByTestId('unified-sidebar')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my account/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my organizations/i })).toBeInTheDocument();

      // Should NOT see Admin section (only regular members)
      expect(screen.queryByText('Administration')).not.toBeInTheDocument();

      // Should see logout button (user email no longer displayed in header)
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    it('does NOT show Users link for a member without admin roles', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [];

      renderLayout({ isAuthenticated: true, role: 'User' }, mockMemberships);

      // Wait for permissions to load
      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      // Additional wait for state to settle
      await waitFor(() => {
        // Users link should not be visible
        expect(screen.queryByRole('link', { name: /^users$/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation visibility for OrgAdmin users', () => {
    it('shows Admin Dashboard link for users who are OrgAdmin in at least one organization', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'My Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      renderLayout({ isAuthenticated: true, role: 'User' }, mockMemberships);

      // Wait for permissions to load
      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      // Should see Administration section and Admin Dashboard link (because user is OrgAdmin)
      await waitFor(() => {
        expect(screen.getByText('Administration')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
      });

      // Should NOT see Users link (only GlobalAdmins can see that)
      expect(screen.queryByRole('link', { name: /^users$/i })).not.toBeInTheDocument();
    });

    it('does NOT show Users link even if user is OrgAdmin', async () => {
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

      renderLayout({ isAuthenticated: true, role: 'User' }, mockMemberships);

      // Wait for permissions to load
      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      // Users link should never be visible for OrgAdmins (only GlobalAdmins)
      expect(screen.queryByRole('link', { name: /^users$/i })).not.toBeInTheDocument();
    });
  });

  describe('Navigation visibility for PlatformAdmin (GlobalAdmin) users', () => {
    it('shows Platform Overview link for PlatformAdmin', async () => {
      renderLayout({ isAuthenticated: true, role: 'Admin', email: 'admin@example.com' }, []);

      // Wait for permissions to load
      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      // Should see Platform Admin badge and Administration section with nav items
      await waitFor(() => {
        expect(screen.getByTestId('platform-admin-badge')).toBeInTheDocument();
        expect(screen.getByTestId('nav-myAccount')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /my organizations/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /platform overview/i })).toBeInTheDocument();
      });
    });

    it('shows Administration section with full admin links for PlatformAdmin', async () => {
      renderLayout({ isAuthenticated: true, role: 'Admin' }, []);

      // Wait for permissions to load
      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      // Administration section should be visible with all global admin links
      await waitFor(() => {
        expect(screen.getByText('Administration')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /platform overview/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /admin dashboard/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /^users$/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /^organizations$/i })).toBeInTheDocument();
      });
    });

    it('shows organization dropdown for PlatformAdmin when memberships exist', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Global Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      renderLayout({ isAuthenticated: true, role: 'Admin' }, mockMemberships);

      await waitFor(() => {
        expect(screen.getByTestId('unified-header-org-selector')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation link destinations', () => {
    it('has correct href attributes for navigation links', async () => {
      renderLayout({ isAuthenticated: true, role: 'Admin' }, []);

      // Wait for permissions to load
      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      await waitFor(() => {
        const myAccountLink = screen.getByTestId('nav-myAccount');
        const myOrgsLink = screen.getByTestId('nav-myOrganizations');
        const adminDashboardLink = screen.getByTestId('admin-nav-adminDashboard');
        const adminMyAccountLink = screen.getByTestId('admin-nav-adminMyAccount');
        const platformOverviewLink = screen.getByTestId('admin-nav-platformDashboard');

        expect(myAccountLink).toHaveAttribute('href', '/me');
        expect(myOrgsLink).toHaveAttribute('href', '/me/organizations');
        expect(adminDashboardLink).toHaveAttribute('href', '/admin/dashboard');
        expect(adminMyAccountLink).toHaveAttribute('href', '/admin/my-account');
        expect(platformOverviewLink).toHaveAttribute('href', '/platform-admin/dashboard');
      });
    });
  });

  describe('Logout functionality', () => {
    it('logs out user and navigates to login page when logout is clicked', async () => {
      renderLayout({ isAuthenticated: true, role: 'User' }, []);
      const user = userEvent.setup();

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });

      // Verify localStorage was cleared
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('authUser')).toBeNull();
    });
  });

  describe('Unified sidebar layout', () => {
    it('renders sidebar navigation for authenticated users', async () => {
      renderLayout({ isAuthenticated: true, role: 'User' }, []);

      await waitFor(() => {
        expect(screen.getByTestId('unified-sidebar')).toBeInTheDocument();
      });
    });

    it('shows organization selector when user has memberships', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Test Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      renderLayout({ isAuthenticated: true, role: 'User' }, mockMemberships);

      await waitFor(() => {
        expect(screen.getByTestId('unified-header-org-selector')).toBeInTheDocument();
      });
    });

    it('does not show organization selector when user has no memberships', async () => {
      renderLayout({ isAuthenticated: true, role: 'User' }, []);

      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      expect(screen.queryByTestId('unified-header-org-selector')).not.toBeInTheDocument();
    });
  });

  describe('Organization switching navigation', () => {
    it('navigates to admin overview when OrgAdmin switches to their admin org', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'membership-2',
          organizationId: 'org-2',
          organizationName: 'Member Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Set up auth state BEFORE rendering
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('authUser', JSON.stringify({
        token: 'test-token',
        userId: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User',
      mfaRequired: false,
      }));
      vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
      vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

      render(
        <MemoryRouter initialEntries={['/']}>
          <NotificationProvider>
            <AuthProvider>
              <OrgProvider isAuthenticated={true}>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<div>Home Content</div>} />
                  </Route>
                  <Route path="/admin/organizations/:orgId/edit" element={<div data-testid="admin-org-edit">Admin Org Edit Page</div>} />
                  <Route path="/me/organizations/:orgId" element={<div data-testid="member-org-view">Member Org View</div>} />
                </Routes>
              </OrgProvider>
            </AuthProvider>
          </NotificationProvider>
        </MemoryRouter>
      );

      // Wait for the org selector to appear
      await waitFor(() => {
        expect(screen.getByTestId('unified-header-org-selector')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const orgSelectorButton = screen.getByTestId('unified-header-org-selector-button');

      // Switch to the Admin Org (which is OrgAdmin role)
      await user.click(orgSelectorButton);
      const adminOption = await screen.findByTestId('org-option-org-1');
      await user.click(adminOption);

      // Should navigate to admin overview for OrgAdmin
      await waitFor(() => {
        expect(screen.getByTestId('admin-org-edit')).toBeInTheDocument();
      });
    });

    it('navigates to member view when switching to org where user is only Member', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'membership-2',
          organizationId: 'org-2',
          organizationName: 'Member Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Set up auth state BEFORE rendering
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('authUser', JSON.stringify({
        token: 'test-token',
        userId: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User',
      mfaRequired: false,
      }));
      vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
      vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

      render(
        <MemoryRouter initialEntries={['/']}>
          <NotificationProvider>
            <AuthProvider>
              <OrgProvider isAuthenticated={true}>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<div>Home Content</div>} />
                  </Route>
                  <Route path="/admin/organizations/:orgId/edit" element={<div data-testid="admin-org-edit">Admin Org Edit Page</div>} />
                  <Route path="/me/organizations/:orgId" element={<div data-testid="member-org-view">Member Org View</div>} />
                </Routes>
              </OrgProvider>
            </AuthProvider>
          </NotificationProvider>
        </MemoryRouter>
      );

      // Wait for the org selector to appear
      await waitFor(() => {
        expect(screen.getByTestId('unified-header-org-selector')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const orgSelectorButton = screen.getByTestId('unified-header-org-selector-button');

      // Switch to the Member Org (which is Member role)
      await user.click(orgSelectorButton);
      const memberOption = await screen.findByTestId('org-option-org-2');
      await user.click(memberOption);

      // Should navigate to member view for regular member
      await waitFor(() => {
        expect(screen.getByTestId('member-org-view')).toBeInTheDocument();
      });
    });
  });

  describe('Mixed-role user scenarios', () => {
    it('shows correct role badge based on selected organization role', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'membership-2',
          organizationId: 'org-2',
          organizationName: 'Member Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      renderLayout({ isAuthenticated: true, role: 'User' }, mockMemberships);

      // Wait for permissions and org data to load
      await waitFor(() => {
        expect(screen.getByTestId('unified-header-org-selector')).toBeInTheDocument();
      }, { timeout: 3000 });

      // First org should be selected by default and should show "Org Admin" badge in header
      await waitFor(() => {
        expect(screen.getByTestId('org-admin-badge')).toBeInTheDocument();
        expect(screen.getByTestId('org-admin-badge')).toHaveTextContent('Org Admin');
      }, { timeout: 3000 });

      // Should see Administration section (because user is OrgAdmin in at least one org)
      expect(screen.getByText('Administration')).toBeInTheDocument();
    });

    it('maintains consistent navigation structure for users with mixed org admin/member roles', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'membership-2',
          organizationId: 'org-2',
          organizationName: 'Member Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      renderLayout({ isAuthenticated: true, role: 'User' }, mockMemberships);

      // Wait for permissions and org data to load
      await waitFor(() => {
        expect(screen.getByTestId('unified-header-org-selector')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Key user navigation items should always be present and in consistent order
      const homeLink = screen.getByTestId('nav-home');
      const myAccountLink = screen.getByTestId('nav-myAccount');
      const myOrgsLink = screen.getByTestId('nav-myOrganizations');

      expect(homeLink).toBeInTheDocument();
      expect(myAccountLink).toBeInTheDocument();
      expect(myOrgsLink).toBeInTheDocument();

      // Verify the Administration section is visible (user is OrgAdmin in at least one org)
      expect(screen.getByText('Administration')).toBeInTheDocument();

      // Admin Dashboard should be visible because user is OrgAdmin in one org
      expect(screen.getByTestId('admin-nav-adminDashboard')).toBeInTheDocument();
    });

    it('hides Administration section when user switches to member-only org', async () => {
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'membership-2',
          organizationId: 'org-2',
          organizationName: 'Member Org',
          userId: 'user-123',
          role: 'Member',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Setup auth state
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('authUser', JSON.stringify({
        token: 'test-token',
        userId: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User',
      mfaRequired: false,
      }));

      // Mock memberships API responses
      vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
      vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mockMemberships);

      render(
        <MemoryRouter initialEntries={['/']}>
          <NotificationProvider>
            <AuthProvider>
              <OrgProvider isAuthenticated={true}>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<div>Home Content</div>} />
                  </Route>
                  <Route path="/me/organizations/:orgId" element={<Layout />}>
                    <Route index element={<div data-testid="member-org-view">Member Org View</div>} />
                  </Route>
                </Routes>
              </OrgProvider>
            </AuthProvider>
          </NotificationProvider>
        </MemoryRouter>
      );

      // Wait for permissions and org data to load
      await waitFor(() => {
        expect(screen.getByTestId('unified-header-org-selector')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Initially, Administration section should be visible (user is OrgAdmin in Admin Org)
      expect(screen.getByText('Administration')).toBeInTheDocument();
      expect(screen.getByTestId('admin-nav-adminDashboard')).toBeInTheDocument();

      // Switch to the member-only org
      const user = userEvent.setup();
      const orgSelectorButton = screen.getByTestId('unified-header-org-selector-button');
      await user.click(orgSelectorButton);
      const memberOption = await screen.findByTestId('org-option-org-2');
      await user.click(memberOption);

      // Wait for navigation to member view
      await waitFor(() => {
        expect(screen.getByTestId('member-org-view')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Administration section should now be hidden (user is only Member in Member Org)
      await waitFor(() => {
        expect(screen.queryByText('Administration')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Admin Dashboard link should not be visible
      expect(screen.queryByTestId('admin-nav-adminDashboard')).not.toBeInTheDocument();

      // User navigation items should still be present
      expect(screen.getByTestId('nav-home')).toBeInTheDocument();
      expect(screen.getByTestId('nav-myAccount')).toBeInTheDocument();
      expect(screen.getByTestId('nav-myOrganizations')).toBeInTheDocument();
    });
  });
});
