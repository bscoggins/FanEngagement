import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { AdminRoute } from './AdminRoute';
import { membershipsApi } from '../api/membershipsApi';

// Mock the membershipsApi
vi.mock('../api/membershipsApi');

describe('AdminRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderAdminRoute = (initialRoute = '/admin', role = 'Admin', allowOrgAdmin = false) => {
    // Set up auth state
    if (role) {
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('authUser', JSON.stringify({
        token: 'test-token',
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: role,
      }));
    }

    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/" element={<div>Home Page</div>} />
            <Route
              path="/admin"
              element={
                <AdminRoute allowOrgAdmin={allowOrgAdmin}>
                  <div>Admin Content</div>
                </AdminRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('redirects to /login when user is not authenticated', () => {
    renderAdminRoute('/admin', '');
    
    // Should show login page
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects to home when user is authenticated but not admin (allowOrgAdmin=false)', async () => {
    renderAdminRoute('/admin', 'User', false);
    
    // Should redirect to home page
    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders admin content when user is authenticated and is GlobalAdmin', async () => {
    renderAdminRoute('/admin', 'Admin');
    
    // Should show admin content
    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
  });

  it('redirects to home when user is OrgAdmin but allowOrgAdmin=false', async () => {
    const mockMemberships = [
      {
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Test Org',
        userId: 'user-123',
        role: 'OrgAdmin' as const,
        createdAt: '2024-01-01T00:00:00Z',
      }
    ];
    
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
    renderAdminRoute('/admin', 'User', false);
    
    // Should redirect to home page
    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders admin content when user is OrgAdmin and allowOrgAdmin=true', async () => {
    const mockMemberships = [
      {
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Test Org',
        userId: 'user-123',
        role: 'OrgAdmin' as const,
        createdAt: '2024-01-01T00:00:00Z',
      }
    ];
    
    // Setup mock before rendering
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
    
    renderAdminRoute('/admin', 'User', true);
    
    // memberships API should be called
    await waitFor(() => {
      expect(membershipsApi.getByUserId).toHaveBeenCalledWith('user-123');
    });
    
    // Should show admin content after memberships load
    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
  });

  it('redirects to home when user is regular Member and allowOrgAdmin=true', async () => {
    const mockMemberships = [
      {
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Test Org',
        userId: 'user-123',
        role: 'Member' as const,
        createdAt: '2024-01-01T00:00:00Z',
      }
    ];
    
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
    renderAdminRoute('/admin', 'User', true);
    
    // Should redirect to home page (regular members don't have access even with allowOrgAdmin)
    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});
