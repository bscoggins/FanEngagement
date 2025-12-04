import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { HomePage } from '../pages/HomePage';
import { membershipsApi } from '../api/membershipsApi';

// Mock the membershipsApi
vi.mock('../api/membershipsApi', () => ({
  membershipsApi: {
    getByUserId: vi.fn(),
  },
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderHomePage = () => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <NotificationProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<div>Login Page</div>} />
              <Route path="/admin" element={<div>Admin Page</div>} />
              <Route path="/platform-admin/dashboard" element={<div>Platform Admin Dashboard</div>} />
              <Route path="/me/home" element={<div>Member Dashboard</div>} />
            </Routes>
          </AuthProvider>
        </NotificationProvider>
      </MemoryRouter>
    );
  };

  it('renders welcome message for unauthenticated users', () => {
    renderHomePage();
    
    expect(screen.getByText('Welcome to FanEngagement')).toBeInTheDocument();
    expect(screen.getByText(/Get started by logging in/i)).toBeInTheDocument();
  });

  it('shows login link for unauthenticated users', () => {
    renderHomePage();
    
    const loginLink = screen.getByRole('link', { name: /get started by logging in/i });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('redirects authenticated platform admin to /platform-admin/dashboard', async () => {
    // Simulate existing auth session for admin user
    localStorage.setItem('authToken', 'admin-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'admin-token',
      userId: 'admin-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin',
      mfaRequired: false,
    }));

    renderHomePage();

    // Should redirect to platform admin dashboard
    await waitFor(() => {
      expect(screen.getByText('Platform Admin Dashboard')).toBeInTheDocument();
    });
  });

  it('redirects authenticated OrgAdmin to /admin', async () => {
    // Simulate existing auth session for regular user who is OrgAdmin
    localStorage.setItem('authToken', 'orgadmin-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'orgadmin-token',
      userId: 'orgadmin-123',
      email: 'orgadmin@example.com',
      displayName: 'OrgAdmin User',
      role: 'User',
      mfaRequired: false,
    }));

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

    renderHomePage();

    // Should redirect to admin dashboard
    await waitFor(() => {
      expect(screen.getByText('Admin Page')).toBeInTheDocument();
    });
  });

  it('redirects authenticated regular member to /me/home', async () => {
    // Simulate existing auth session for regular member
    localStorage.setItem('authToken', 'member-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'member-token',
      userId: 'member-123',
      email: 'member@example.com',
      displayName: 'Regular Member',
      role: 'User',
      mfaRequired: false,
    }));

    vi.mocked(membershipsApi.getByUserId).mockResolvedValueOnce([]);

    renderHomePage();

    // Should redirect to member dashboard
    await waitFor(() => {
      expect(screen.getByText('Member Dashboard')).toBeInTheDocument();
    });
  });

  it('shows redirecting message while determining route for authenticated user', async () => {
    // Simulate existing auth session for regular user
    localStorage.setItem('authToken', 'member-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'member-token',
      userId: 'member-123',
      email: 'member@example.com',
      displayName: 'Regular Member',
      role: 'User',
      mfaRequired: false,
    }));

    // Delay the API response
    vi.mocked(membershipsApi.getByUserId).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 500))
    );

    renderHomePage();

    // Should show redirecting message
    await waitFor(() => {
      expect(screen.getByText('Redirecting...')).toBeInTheDocument();
    });
  });

  it('handles memberships API error gracefully and still redirects', async () => {
    // Simulate existing auth session for regular user
    localStorage.setItem('authToken', 'member-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'member-token',
      userId: 'member-123',
      email: 'member@example.com',
      displayName: 'Regular Member',
      role: 'User',
      mfaRequired: false,
    }));

    vi.mocked(membershipsApi.getByUserId).mockRejectedValueOnce(new Error('Network error'));

    renderHomePage();

    // Should still redirect to member dashboard on error
    await waitFor(() => {
      expect(screen.getByText('Member Dashboard')).toBeInTheDocument();
    });
  });
});
