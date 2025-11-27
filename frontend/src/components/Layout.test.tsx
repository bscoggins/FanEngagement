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
      expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
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

      // Should see My Account and My Organizations
      expect(screen.getByRole('link', { name: /my account/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my organizations/i })).toBeInTheDocument();

      // Should NOT see Users or Admin links
      expect(screen.queryByRole('link', { name: /^users$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^admin$/i })).not.toBeInTheDocument();

      // Should see logout button and user info
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
      expect(screen.getByText(/alice@example.com/i)).toBeInTheDocument();
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
    it('shows Admin link for users who are OrgAdmin in at least one organization', async () => {
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

      // Should see Admin link (because user is OrgAdmin)
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /^admin$/i })).toBeInTheDocument();
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
    it('shows both Users and Admin links for PlatformAdmin', async () => {
      renderLayout({ isAuthenticated: true, role: 'Admin', email: 'admin@example.com' }, []);

      // Wait for permissions to load
      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      // Should see all nav items
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /my account/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /my organizations/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /^users$/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /^admin$/i })).toBeInTheDocument();
      });
    });

    it('shows Users link only for PlatformAdmin', async () => {
      renderLayout({ isAuthenticated: true, role: 'Admin' }, []);

      // Wait for permissions to load
      await waitFor(() => {
        expect(membershipsApi.getByUserId).toHaveBeenCalled();
      });

      // Users link should be visible for Admin
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /^users$/i })).toBeInTheDocument();
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
        const myAccountLink = screen.getByRole('link', { name: /my account/i });
        const myOrgsLink = screen.getByRole('link', { name: /my organizations/i });
        const usersLink = screen.getByRole('link', { name: /^users$/i });
        const adminLink = screen.getByRole('link', { name: /^admin$/i });

        expect(myAccountLink).toHaveAttribute('href', '/me');
        expect(myOrgsLink).toHaveAttribute('href', '/me/organizations');
        expect(usersLink).toHaveAttribute('href', '/users');
        expect(adminLink).toHaveAttribute('href', '/admin');
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
});
