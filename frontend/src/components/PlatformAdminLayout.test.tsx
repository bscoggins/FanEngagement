import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { OrgProvider } from '../contexts/OrgContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { PlatformAdminLayout } from './PlatformAdminLayout';
import { membershipsApi } from '../api/membershipsApi';
import type { MembershipWithOrganizationDto } from '../types/api';

// Mock the membershipsApi
vi.mock('../api/membershipsApi');

describe('PlatformAdminLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderPlatformAdminLayout = (
    initialRoute = '/platform-admin',
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
                <Route path="/platform-admin" element={<PlatformAdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<div>Dashboard Content</div>} />
                  <Route path="my-account" element={<div>My Account Content</div>} />
                  <Route path="audit-log" element={<div>Audit Log Content</div>} />
                </Route>
                <Route path="/login" element={<div>Login Page</div>} />
              </Routes>
            </OrgProvider>
          </AuthProvider>
        </NotificationProvider>
      </MemoryRouter>
    );
  };

  it('renders platform admin header with title', async () => {
    renderPlatformAdminLayout();
    expect(await screen.findByRole('heading', { name: 'FanEngagement' })).toBeInTheDocument();
  });

  it('displays logout button', async () => {
    renderPlatformAdminLayout();
    expect(await screen.findByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('displays horizontal navigation links for platform admin', async () => {
    const user = userEvent.setup();
    renderPlatformAdminLayout();
    
    // Platform admin should see Platform and Account dropdowns
    await waitFor(() => {
      expect(screen.getByTestId('nav-dropdown-platform')).toBeInTheDocument();
      expect(screen.getByTestId('nav-dropdown-account')).toBeInTheDocument();
    });
    
    // Open Platform dropdown to verify links
    await user.click(screen.getByTestId('nav-dropdown-platform'));
    await waitFor(() => {
      expect(screen.getByTestId('nav-platformDashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-platformAuditLog')).toBeInTheDocument();
    });
    
    // Open Account dropdown to verify My Account
    await user.click(screen.getByTestId('nav-dropdown-account'));
    await waitFor(() => {
      expect(screen.getByTestId('nav-platformMyAccount')).toBeInTheDocument();
    });
  });

  it('renders child content in main area', async () => {
    renderPlatformAdminLayout('/platform-admin/dashboard');
    expect(await screen.findByText('Dashboard Content')).toBeInTheDocument();
  });

  it('navigates to my account page when link is clicked', async () => {
    renderPlatformAdminLayout('/platform-admin/dashboard');
    const user = userEvent.setup();

    // Open Account dropdown first
    await waitFor(() => {
      expect(screen.getByTestId('nav-dropdown-account')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('nav-dropdown-account'));

    // Find and click the My Account link inside the dropdown
    const myAccountLink = await screen.findByTestId('nav-platformMyAccount');
    expect(myAccountLink).toHaveAttribute('href', '/platform-admin/my-account');
    await user.click(myAccountLink);

    await waitFor(() => {
      expect(screen.getByText('My Account Content')).toBeInTheDocument();
    });
  });

  it('handles logout button click', async () => {
    renderPlatformAdminLayout();
    const user = userEvent.setup();
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);
    
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });
});
