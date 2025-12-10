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
                  <Route path="organizations/:orgId/edit" element={<div>Org Edit Content</div>} />
                  <Route path="organizations/:orgId/memberships" element={<div>Memberships Content</div>} />
                  <Route path="my-account" element={<div>My Account Content</div>} />
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

  it('renders admin header with title', async () => {
    renderAdminLayout();
    expect(await screen.findByText('FanEngagement Admin')).toBeInTheDocument();
  });

  it('displays logout button', async () => {
    renderAdminLayout();
    expect(await screen.findByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('displays sidebar navigation links for platform admin', async () => {
    renderAdminLayout();
    
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('My Account')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Organizations')).toBeInTheDocument();
      expect(screen.getByText('Dev Tools')).toBeInTheDocument();
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

  it('navigates to my account page when link is clicked', async () => {
    renderAdminLayout('/admin');
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('My Account')).toBeInTheDocument();
    });

    const myAccountLink = screen.getByText('My Account').closest('a');
    expect(myAccountLink).toHaveAttribute('href', '/admin/my-account');

    await user.click(myAccountLink!);

    await waitFor(() => {
      expect(screen.getByText('My Account Content')).toBeInTheDocument();
    });
  });

  it('has correct navigation link hrefs for platform admin', async () => {
    renderAdminLayout();
    
    await waitFor(() => {
      const dashboardLink = screen.getByText('Admin Dashboard').closest('a');
      const myAccountLink = screen.getByText('My Account').closest('a');
      const usersLink = screen.getByText('Users').closest('a');
      const orgsLink = screen.getByText('Organizations').closest('a');
      const devToolsLink = screen.getByText('Dev Tools').closest('a');
      
      expect(dashboardLink).toHaveAttribute('href', '/admin/dashboard');
      expect(myAccountLink).toHaveAttribute('href', '/admin/my-account');
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
        expect(screen.getByText('My Account')).toBeInTheDocument();
      });
      
      // Should NOT see platform admin items
      expect(screen.queryByText('Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Organizations')).not.toBeInTheDocument();
      expect(screen.queryByText('Dev Tools')).not.toBeInTheDocument();
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

      const orgButton = screen.getByTestId('admin-header-org-selector-button');
      await user.click(orgButton);
      const memberOption = await screen.findByTestId('org-option-org-member');
      await user.click(memberOption);

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

      const orgButton = screen.getByTestId('admin-header-org-selector-button');
      await user.click(orgButton);
      const adminOption = await screen.findByTestId('org-option-org-admin');
      await user.click(adminOption);

      // Should navigate to admin org edit page
      await waitFor(() => {
        expect(screen.getByText('Org Edit Content')).toBeInTheDocument();
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

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
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

      await waitFor(() => {
        expect(screen.getByText('Memberships')).toBeInTheDocument();
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

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
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

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
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

    it('displays keyboard shortcut hints on org nav items', async () => {
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

      await waitFor(() => {
        const overviewLink = screen.getByTestId('org-nav-orgOverview');
        expect(overviewLink).toBeInTheDocument();
        expect(overviewLink).not.toHaveTextContent(/Ctrl1|⌘1/);
        expect(overviewLink).toHaveAttribute('aria-label', expect.stringMatching(/Shortcut (Ctrl|Cmd)\+1/));
        
        const membershipsLink = screen.getByTestId('org-nav-manageMemberships');
        expect(membershipsLink).not.toHaveTextContent(/Ctrl2|⌘2/);
        expect(membershipsLink).toHaveAttribute('aria-label', expect.stringMatching(/Shortcut (Ctrl|Cmd)\+2/));
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

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
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

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
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

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
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

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
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
