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

    it('renders skip link and moves focus to main content', async () => {
      const user = userEvent.setup();
      renderLayout({ isAuthenticated: false, role: 'User' });

      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toBeInTheDocument();

      await user.tab();
      expect(skipLink).toHaveFocus();

      await user.keyboard('{Enter}');
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'main-content');
      expect(main).toHaveFocus();
    });
  });

  describe('Navigation visibility for regular members', () => {
    it('shows only My Account and My Organizations for a regular member', async () => {
      const user = userEvent.setup();
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

      // Wait for horizontal nav to appear
      await waitFor(() => {
        expect(screen.getByTestId('horizontal-nav')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Account dropdown should exist - click to reveal links
      const accountDropdown = screen.getByTestId('nav-dropdown-account');
      expect(accountDropdown).toBeInTheDocument();
      await user.click(accountDropdown);
      
      // Now check for My Account and My Organizations links inside dropdown (role="menuitem")
      await waitFor(() => {
        expect(screen.getByTestId('nav-myAccount')).toBeInTheDocument();
      });
      expect(screen.getByTestId('nav-myOrganizations')).toBeInTheDocument();

      // Should NOT see Management dropdown (only regular members)
      expect(screen.queryByTestId('nav-dropdown-management')).not.toBeInTheDocument();

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

      // OrgAdmin only has 1 Management item (Admin Dashboard), so it renders as a direct link, not a dropdown
      await waitFor(() => {
        const adminDashboardLink = screen.getByTestId('nav-adminDashboard');
        expect(adminDashboardLink).toBeInTheDocument();
        expect(adminDashboardLink).toHaveAttribute('href', '/admin/dashboard');
      });

      // Should NOT see Users link (only GlobalAdmins can see that)
      expect(screen.queryByTestId('nav-manageUsers')).not.toBeInTheDocument();
      // Should NOT see Management dropdown (only 1 item = direct link)
      expect(screen.queryByTestId('nav-dropdown-management')).not.toBeInTheDocument();
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

    it('shows only the admin-scoped My Account link for OrgAdmin users', async () => {
      const user = userEvent.setup();
      const mockMemberships: MembershipWithOrganizationDto[] = [
        {
          id: 'membership-1',
          organizationId: 'org-1',
          organizationName: 'Org Admin Org',
          userId: 'user-123',
          role: 'OrgAdmin',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      renderLayout({ isAuthenticated: true, role: 'User' }, mockMemberships);

      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      // Open the Account dropdown to find the My Account link
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-account')).toBeInTheDocument();
      });
      
      await user.click(screen.getByTestId('nav-dropdown-account'));
      
      await waitFor(() => {
        const adminMyAccountLink = screen.getByTestId('nav-adminMyAccount');
        expect(adminMyAccountLink).toHaveAttribute('href', '/admin/my-account');
        expect(screen.queryByTestId('nav-platformMyAccount')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation visibility for PlatformAdmin (GlobalAdmin) users', () => {
    it('shows Platform Overview link for PlatformAdmin', async () => {
      const user = userEvent.setup();
      renderLayout({ isAuthenticated: true, role: 'Admin', email: 'admin@example.com' }, []);

      // Wait for permissions to load
      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      // Should see Platform Admin badge and horizontal nav
      await waitFor(() => {
        expect(screen.getByTestId('platform-admin-badge')).toBeInTheDocument();
        expect(screen.getByTestId('horizontal-nav')).toBeInTheDocument();
      });

      // Open Account dropdown to find My Account and My Organizations
      const accountDropdown = screen.getByTestId('nav-dropdown-account');
      await user.click(accountDropdown);
      // Links in dropdowns have role="menuitem", use testId instead
      expect(screen.getByTestId('nav-myOrganizations')).toBeInTheDocument();
      expect(screen.getByTestId('nav-platformMyAccount')).toBeInTheDocument();
      expect(screen.queryByTestId('nav-adminMyAccount')).not.toBeInTheDocument();

      // Open Platform dropdown to find Platform Overview
      await user.click(screen.getByTestId('nav-dropdown-platform'));
      expect(screen.getByTestId('nav-platformDashboard')).toBeInTheDocument();
    });

    it('shows Management dropdown with full admin links for PlatformAdmin', async () => {
      const user = userEvent.setup();
      renderLayout({ isAuthenticated: true, role: 'Admin' }, []);

      // Wait for permissions to load
      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      // Should see horizontal nav with Management dropdown
      await waitFor(() => {
        expect(screen.getByTestId('horizontal-nav')).toBeInTheDocument();
        expect(screen.getByTestId('nav-dropdown-management')).toBeInTheDocument();
      });

      // Open Management dropdown to verify admin links (use testId - dropdown links have role="menuitem")
      await user.click(screen.getByTestId('nav-dropdown-management'));
      expect(screen.getByTestId('nav-adminDashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-manageUsers')).toBeInTheDocument();
      expect(screen.getByTestId('nav-manageOrganizations')).toBeInTheDocument();

      // Platform dropdown should also be visible
      await user.click(screen.getByTestId('nav-dropdown-platform'));
      expect(screen.getByTestId('nav-platformDashboard')).toBeInTheDocument();
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
      const user = userEvent.setup();
      renderLayout({ isAuthenticated: true, role: 'Admin' }, []);

      // Wait for permissions to load
      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('horizontal-nav')).toBeInTheDocument();
      });

      // Open Account dropdown to check My Account and My Organizations links
      await user.click(screen.getByTestId('nav-dropdown-account'));
      const myOrgsLink = screen.getByTestId('nav-myOrganizations');
      const platformMyAccountLink = screen.getByTestId('nav-platformMyAccount');
      expect(myOrgsLink).toHaveAttribute('href', '/me/organizations');
      expect(platformMyAccountLink).toHaveAttribute('href', '/platform-admin/my-account');
      expect(screen.queryByTestId('nav-adminMyAccount')).not.toBeInTheDocument();

      // Open Management dropdown to check Admin Dashboard link
      await user.click(screen.getByTestId('nav-dropdown-management'));
      const adminDashboardLink = screen.getByTestId('nav-adminDashboard');
      expect(adminDashboardLink).toHaveAttribute('href', '/admin/dashboard');

      // Open Platform dropdown to check Platform Overview link
      await user.click(screen.getByTestId('nav-dropdown-platform'));
      const platformOverviewLink = screen.getByTestId('nav-platformDashboard');
      expect(platformOverviewLink).toHaveAttribute('href', '/platform-admin/dashboard');
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

  describe('Unified layout', () => {
    it('renders horizontal navigation for authenticated users', async () => {
      renderLayout({ isAuthenticated: true, role: 'User' }, []);

      await waitFor(() => {
        expect(screen.getByTestId('horizontal-nav')).toBeInTheDocument();
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
                  <Route path="/admin/organizations/:orgId" element={<div data-testid="admin-org-dashboard">Admin Org Dashboard</div>} />
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

      // Should navigate to admin dashboard for OrgAdmin
      await waitFor(() => {
        expect(screen.getByTestId('admin-org-dashboard')).toBeInTheDocument();
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

      // OrgAdmin only has 1 Management item, so it renders as a direct link (not dropdown)
      expect(screen.getByTestId('nav-adminDashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('nav-dropdown-management')).not.toBeInTheDocument();
    });

    it('maintains consistent navigation structure for users with mixed org admin/member roles', async () => {
      const user = userEvent.setup();
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

      // Should see horizontal nav with Account dropdown
      expect(screen.getByTestId('horizontal-nav')).toBeInTheDocument();
      
      // Open Account dropdown to verify user navigation items
      const accountDropdown = screen.getByTestId('nav-dropdown-account');
      await user.click(accountDropdown);
      // Home link exists (resolves to appropriate dashboard based on role)
      expect(screen.getByTestId('nav-home')).toBeInTheDocument();
      expect(screen.getByTestId('nav-myOrganizations')).toBeInTheDocument();

      // OrgAdmin only has 1 Management item, so it's a direct link (not dropdown)
      expect(screen.getByTestId('nav-adminDashboard')).toBeInTheDocument();
      expect(screen.queryByTestId('nav-dropdown-management')).not.toBeInTheDocument();
    });

    it('keeps Admin Dashboard link visible even when user switches to member-only org (admin access persists)', async () => {
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

      // Initially, Admin Dashboard link should be visible (user is OrgAdmin in Admin Org)
      // OrgAdmin only has 1 Management item, so it's a direct link
      expect(screen.getByTestId('nav-adminDashboard')).toBeInTheDocument();

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

      // Admin Dashboard link should STILL be visible because user is OrgAdmin in another org
      // The navigation shows capabilities based on ANY membership, not just active org
      expect(screen.getByTestId('nav-adminDashboard')).toBeInTheDocument();

      // Account dropdown should still be present
      expect(screen.getByTestId('nav-dropdown-account')).toBeInTheDocument();
    });
  });
});
