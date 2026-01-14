import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
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
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<div>Dashboard Content</div>} />
                  <Route path="users" element={<div>Users Content</div>} />
                  <Route path="organizations" element={<div>Organizations Content</div>} />
                  <Route path="organizations/:orgId" element={<div>Org Dashboard Content</div>} />
                  <Route path="organizations/:orgId/edit" element={<div>Org Edit Content</div>} />
                  <Route path="organizations/:orgId/memberships" element={<div>Memberships Content</div>} />
                  <Route path="dev-tools" element={<div>Dev Tools Content</div>} />
                </Route>
                <Route path="/" element={<div>Home Page</div>} />
                <Route path="/me/home" element={<div>Member Home Page</div>} />
                <Route path="/me/organizations/:orgId" element={<div data-testid="member-org-page">Member Org Page</div>} />
                <Route path="/platform-admin/dashboard" element={<div>Platform Admin Dashboard</div>} />
                <Route path="/platform-admin/my-account" element={<div>Platform My Account Content</div>} />
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
            </OrgProvider>
          </AuthProvider>
        </NotificationProvider>
      </MemoryRouter>
    );
  };

  it('renders admin header with title', async () => {
    renderAdminLayout();
    expect(await screen.findByRole('heading', { name: 'FanEngagement' })).toBeInTheDocument();
  });

  it('displays logout button', async () => {
    renderAdminLayout();
    expect(await screen.findByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('displays horizontal navigation dropdowns for platform admin', async () => {
    const user = userEvent.setup();
    renderAdminLayout();
    
    // Platform admin should see Platform, Management, and Account dropdowns
    await waitFor(() => {
      expect(screen.getByTestId('nav-dropdown-platform')).toBeInTheDocument();
      expect(screen.getByTestId('nav-dropdown-management')).toBeInTheDocument();
      expect(screen.getByTestId('nav-dropdown-account')).toBeInTheDocument();
    });
    
    // Open Management dropdown to verify links
    await user.click(screen.getByTestId('nav-dropdown-management'));
    await waitFor(() => {
      expect(screen.getByTestId('nav-adminDashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-manageUsers')).toBeInTheDocument();
      expect(screen.getByTestId('nav-manageOrganizations')).toBeInTheDocument();
    });
    
    // Open Platform dropdown to verify Dev Tools
    await user.click(screen.getByTestId('nav-dropdown-platform'));
    await waitFor(() => {
      expect(screen.getByTestId('nav-devTools')).toBeInTheDocument();
    });
    
    // Open Account dropdown to verify platform My Account
    await user.click(screen.getByTestId('nav-dropdown-account'));
    await waitFor(() => {
      expect(screen.getByTestId('nav-platformMyAccount')).toBeInTheDocument();
      // OrgAdmin my account should NOT be present for Platform Admin
      expect(screen.queryByTestId('nav-adminMyAccount')).not.toBeInTheDocument();
    });
  });

  it('does not render legacy home link in the header', async () => {
    renderAdminLayout();
    await waitFor(() => {
      expect(screen.queryByText('← Home')).not.toBeInTheDocument();
    });
  });

  it('renders child content in main area', async () => {
    renderAdminLayout('/admin');
    expect(await screen.findByText('Dashboard Content')).toBeInTheDocument();
  });

  it('navigates to users page when users link is clicked', async () => {
    renderAdminLayout('/admin');
    const user = userEvent.setup();
    
    // Open Management dropdown first
    await waitFor(() => {
      expect(screen.getByTestId('nav-dropdown-management')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('nav-dropdown-management'));
    
    // Find and click Users link
    const usersLink = await screen.findByTestId('nav-manageUsers');
    expect(usersLink).toHaveAttribute('href', '/admin/users');
    await user.click(usersLink);
    
    await waitFor(() => {
      expect(screen.getByText('Users Content')).toBeInTheDocument();
    });
  });

  it('navigates to my account page when link is clicked', async () => {
    renderAdminLayout('/admin');
    const user = userEvent.setup();

    // Open Account dropdown first
    await waitFor(() => {
      expect(screen.getByTestId('nav-dropdown-account')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('nav-dropdown-account'));

    const myAccountLink = await screen.findByTestId('nav-platformMyAccount');
    expect(myAccountLink).toHaveAttribute('href', '/platform-admin/my-account');

    await user.click(myAccountLink);

    await waitFor(() => {
      expect(screen.getByText('Platform My Account Content')).toBeInTheDocument();
    });
  });

  it('has correct navigation link hrefs for platform admin', async () => {
    const user = userEvent.setup();
    renderAdminLayout();
    
    // Open Management dropdown
    await waitFor(() => {
      expect(screen.getByTestId('nav-dropdown-management')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('nav-dropdown-management'));
    
    await waitFor(() => {
      const dashboardLink = screen.getByTestId('nav-adminDashboard');
      const usersLink = screen.getByTestId('nav-manageUsers');
      const orgsLink = screen.getByTestId('nav-manageOrganizations');
      
      expect(dashboardLink).toHaveAttribute('href', '/admin/dashboard');
      expect(usersLink).toHaveAttribute('href', '/admin/users');
      expect(orgsLink).toHaveAttribute('href', '/admin/organizations');
    });
    
    // Open Platform dropdown for Dev Tools
    await user.click(screen.getByTestId('nav-dropdown-platform'));
    await waitFor(() => {
      const devToolsLink = screen.getByTestId('nav-devTools');
      expect(devToolsLink).toHaveAttribute('href', '/admin/dev-tools');
    });
    
    // Open Account dropdown for My Account
    await user.click(screen.getByTestId('nav-dropdown-account'));
    await waitFor(() => {
      const platformMyAccountLink = screen.getByTestId('nav-platformMyAccount');
      expect(platformMyAccountLink).toHaveAttribute('href', '/platform-admin/my-account');
    });
  });

  it('renders a single My Account link for platform admin in admin layout', async () => {
    const user = userEvent.setup();
    renderAdminLayout();

    // Open Account dropdown
    await waitFor(() => {
      expect(screen.getByTestId('nav-dropdown-account')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('nav-dropdown-account'));

    await waitFor(() => {
      // Should NOT have org admin my account
      expect(screen.queryByTestId('nav-adminMyAccount')).not.toBeInTheDocument();
      // Should have exactly one My Account link (platform version)
      const myAccountLinks = screen.getAllByText('My Account');
      expect(myAccountLinks).toHaveLength(1);
      expect(screen.getByTestId('nav-platformMyAccount')).toBeInTheDocument();
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
    await act(async () => {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    
    // Verify localStorage was cleared
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authUser')).toBeNull();
  });

  describe('OrgAdmin navigation', () => {
    it('displays only admin dashboard for org admin without active org', async () => {
      const user = userEvent.setup();
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

      // OrgAdmin with one Management item gets a direct link instead of dropdown
      await waitFor(() => {
        expect(screen.getByTestId('nav-adminDashboard')).toBeInTheDocument();
      });
      
      // Open Account dropdown to verify correct My Account version
      await user.click(screen.getByTestId('nav-dropdown-account'));
      await waitFor(() => {
        expect(screen.getByTestId('nav-adminMyAccount')).toBeInTheDocument();
      });
      
      // Should NOT see platform admin items (no Platform dropdown)
      expect(screen.queryByTestId('nav-dropdown-platform')).not.toBeInTheDocument();
    });

    it('displays org-scoped items when org is active', async () => {
      const user = userEvent.setup();
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

      // Should see Organization dropdown when org is active
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-organization')).toBeInTheDocument();
      });
      
      // Open Organization dropdown to verify org-scoped items
      await user.click(screen.getByTestId('nav-dropdown-organization'));
      await waitFor(() => {
        expect(screen.getByTestId('nav-orgOverview')).toBeInTheDocument();
        expect(screen.getByTestId('nav-manageMemberships')).toBeInTheDocument();
        expect(screen.getByTestId('nav-manageShareTypes')).toBeInTheDocument();
        expect(screen.getByTestId('nav-manageProposals')).toBeInTheDocument();
        expect(screen.getByTestId('nav-webhookEvents')).toBeInTheDocument();
      });
      
      // Should see org admin dashboard (direct link for single Management item)
      expect(screen.getByTestId('nav-adminDashboard')).toBeInTheDocument();
      
      // Should see org switcher with org name in header
      const orgDropdown = screen.getByTestId('admin-header-org-selector');
      expect(orgDropdown).toBeInTheDocument();
      const orgButton = screen.getByTestId('admin-header-org-selector-button');
      await user.click(orgButton);
      expect(await screen.findByTestId('org-option-org-1')).toBeInTheDocument();
      
      // Should see "Org Admin" badge in header
      expect(screen.getByTestId('org-admin-badge')).toBeInTheDocument();
      expect(screen.getByTestId('org-admin-badge')).toHaveTextContent('Org Admin');
    });

    it('does not include a home link for org admins either', async () => {
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
        expect(screen.queryByText('← Home')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mixed-role user navigation', () => {
    it('displays all organizations in the switcher for mixed-role users', async () => {
      const user = userEvent.setup();
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
        expect(screen.getByTestId('admin-header-org-selector')).toBeInTheDocument();
      });

      const orgButton = screen.getByTestId('admin-header-org-selector-button');
      await user.click(orgButton);

      expect(await screen.findByTestId('org-option-org-admin-org')).toBeInTheDocument();
      expect(await screen.findByTestId('org-option-org-member-org')).toBeInTheDocument();
    });

    it('shows org admin nav items when admin org is selected', async () => {
      const user = userEvent.setup();
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

      // Should see Organization dropdown when org is active
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-organization')).toBeInTheDocument();
      });
      
      // Open Organization dropdown to verify org admin nav items
      await user.click(screen.getByTestId('nav-dropdown-organization'));
      await waitFor(() => {
        expect(screen.getByTestId('nav-orgOverview')).toBeInTheDocument();
        expect(screen.getByTestId('nav-manageMemberships')).toBeInTheDocument();
        expect(screen.getByTestId('nav-manageShareTypes')).toBeInTheDocument();
        expect(screen.getByTestId('nav-manageProposals')).toBeInTheDocument();
        expect(screen.getByTestId('nav-webhookEvents')).toBeInTheDocument();
      });
        
      // Should show "Org Admin" badge in header
      expect(screen.getByTestId('org-admin-badge')).toBeInTheDocument();
      expect(screen.getByTestId('org-admin-badge')).toHaveTextContent('Org Admin');
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
        // Should NOT see org admin nav items (Organization dropdown should not exist for Member role)
        // User is OrgAdmin in another org so they can access admin layout,
        // but the active org is member-only, so no Organization dropdown should show
        expect(screen.queryByTestId('nav-dropdown-organization')).not.toBeInTheDocument();
        expect(screen.queryByTestId('nav-orgOverview')).not.toBeInTheDocument();
        expect(screen.queryByTestId('nav-manageMemberships')).not.toBeInTheDocument();
        
        // Should NOT show "Org Admin" badge in header (member role doesn't get badge)
        expect(screen.queryByTestId('org-admin-badge')).not.toBeInTheDocument();
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

      const orgButton = screen.getByTestId('admin-header-org-selector-button');
      await user.click(orgButton);
      const memberOption = await screen.findByTestId('org-option-org-member');
      await user.click(memberOption);

      // Should navigate to member org page, not admin org page
      await waitFor(() => {
        expect(screen.getByTestId('member-org-page')).toBeInTheDocument();
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

      const orgButton = screen.getByTestId('admin-header-org-selector-button');
      await user.click(orgButton);
      const adminOption = await screen.findByTestId('org-option-org-admin');
      await user.click(adminOption);

      // Should navigate to admin org dashboard page
      await waitFor(() => {
        expect(screen.getByText('Org Dashboard Content')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard shortcuts for org admin navigation', () => {
    it('navigates to org overview with Ctrl+1', async () => {
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
      
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-1',
        name: 'Test Org',
        role: 'OrgAdmin',
      }));
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships,
      });

      // Wait for Organization dropdown to appear (items are inside dropdown now)
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-organization')).toBeInTheDocument();
      });

      // Simulate Ctrl+1 keypress
      const event = new KeyboardEvent('keydown', { 
        key: '1', 
        ctrlKey: true,
        bubbles: true 
      });
      await act(async () => {
        document.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(screen.getByText('Org Edit Content')).toBeInTheDocument();
      });
    });

    it('navigates to memberships with Ctrl+2', async () => {
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
      
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-1',
        name: 'Test Org',
        role: 'OrgAdmin',
      }));
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships,
      });

      // Wait for Organization dropdown to appear (items are inside dropdown now)
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-organization')).toBeInTheDocument();
      });

      // Simulate Ctrl+2 keypress
      const event = new KeyboardEvent('keydown', { 
        key: '2', 
        ctrlKey: true,
        bubbles: true 
      });
      await act(async () => {
        document.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(screen.getByText('Memberships Content')).toBeInTheDocument();
      });
    });

    it('shows keyboard help toast when shortcut is used', async () => {
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
      
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-1',
        name: 'Test Org',
        role: 'OrgAdmin',
      }));
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships,
      });

      // Wait for Organization dropdown to appear (items are inside dropdown now)
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-organization')).toBeInTheDocument();
      });

      // Simulate Ctrl+1 keypress
      const event = new KeyboardEvent('keydown', { 
        key: '1', 
        ctrlKey: true,
        bubbles: true 
      });
      await act(async () => {
        document.dispatchEvent(event);
      });

      // Check for keyboard help toast
      await waitFor(() => {
        expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      });
    });

    it('does not handle shortcuts when no active org', async () => {
      renderAdminLayout('/admin', {
        role: 'Admin',
      });

      // For PlatformAdmin without active org, Management dropdown exists with adminDashboard
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-management')).toBeInTheDocument();
      });

      const event = new KeyboardEvent('keydown', { 
        key: '1', 
        ctrlKey: true,
        bubbles: true 
      });
      await act(async () => {
        document.dispatchEvent(event);
      });

      // Should not show keyboard help (no org selected)
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });

    it('displays navigation items inside Organization dropdown', async () => {
      const user = userEvent.setup();
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
      
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-1',
        name: 'Test Org',
        role: 'OrgAdmin',
      }));
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships,
      });

      // Wait for Organization dropdown to appear and open it
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-organization')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('nav-dropdown-organization'));

      await waitFor(() => {
        const overviewLink = screen.getByTestId('nav-orgOverview');
        expect(overviewLink).toBeInTheDocument();
        
        const membershipsLink = screen.getByTestId('nav-manageMemberships');
        expect(membershipsLink).toBeInTheDocument();
      });
    });

    it('navigates with Cmd+1 on Mac', async () => {
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
      
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-1',
        name: 'Test Org',
        role: 'OrgAdmin',
      }));
      
      // Mock Mac platform
      const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships,
      });

      // Wait for Organization dropdown to appear (items are inside dropdown now)
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-organization')).toBeInTheDocument();
      });

      // Simulate Cmd+1 keypress on Mac
      const event = new KeyboardEvent('keydown', { 
        key: '1', 
        metaKey: true,  // Use metaKey for Mac
        bubbles: true 
      });
      await act(async () => {
        document.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(screen.getByText('Org Edit Content')).toBeInTheDocument();
      });
      
      // Restore original platform
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform);
      }
    });

    it('ignores shortcuts when Alt key is pressed', async () => {
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
      
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-1',
        name: 'Test Org',
        role: 'OrgAdmin',
      }));
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships,
      });

      // Wait for Organization dropdown to appear (items are inside dropdown now)
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-organization')).toBeInTheDocument();
      });

      // Simulate Ctrl+Alt+1 keypress (should be ignored)
      const event = new KeyboardEvent('keydown', { 
        key: '1', 
        ctrlKey: true,
        altKey: true,  // Alt key should prevent shortcut
        bubbles: true 
      });
      await act(async () => {
        document.dispatchEvent(event);
      });

      // Should remain on dashboard, not navigate
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
      expect(screen.queryByText('Org Edit Content')).not.toBeInTheDocument();
    });

    it('ignores shortcuts when Shift key is pressed', async () => {
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
      
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-1',
        name: 'Test Org',
        role: 'OrgAdmin',
      }));
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships,
      });

      // Wait for Organization dropdown to appear (items are inside dropdown now)
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-organization')).toBeInTheDocument();
      });

      // Simulate Ctrl+Shift+1 keypress (should be ignored)
      const event = new KeyboardEvent('keydown', { 
        key: '1', 
        ctrlKey: true,
        shiftKey: true,  // Shift key should prevent shortcut
        bubbles: true 
      });
      await act(async () => {
        document.dispatchEvent(event);
      });

      // Should remain on dashboard, not navigate
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
      expect(screen.queryByText('Org Edit Content')).not.toBeInTheDocument();
    });

    it('ignores shortcuts when both Alt and Shift keys are pressed', async () => {
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
      
      localStorage.setItem('activeOrganization', JSON.stringify({
        id: 'org-1',
        name: 'Test Org',
        role: 'OrgAdmin',
      }));
      
      renderAdminLayout('/admin', {
        role: 'User',
        mockMemberships,
      });

      // Wait for Organization dropdown to appear (items are inside dropdown now)
      await waitFor(() => {
        expect(screen.getByTestId('nav-dropdown-organization')).toBeInTheDocument();
      });

      // Simulate Ctrl+Alt+Shift+1 keypress (should be ignored)
      const event = new KeyboardEvent('keydown', { 
        key: '1', 
        ctrlKey: true,
        altKey: true,
        shiftKey: true,  // Multiple modifiers should prevent shortcut
        bubbles: true 
      });
      await act(async () => {
        document.dispatchEvent(event);
      });

      // Should remain on dashboard, not navigate
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
      expect(screen.queryByText('Org Edit Content')).not.toBeInTheDocument();
    });
  });
});
