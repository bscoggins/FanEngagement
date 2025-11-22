import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OrgAdminRoute } from './OrgAdminRoute';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

// Mock dependencies
vi.mock('../auth/AuthContext');
vi.mock('../hooks/usePermissions');

describe('OrgAdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect to login when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
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

    render(
      <MemoryRouter initialEntries={['/admin/organizations/org-1/edit']}>
        <Routes>
          <Route path="/admin/organizations/:orgId/edit" element={
            <OrgAdminRoute>
              <div>Admin Content</div>
            </OrgAdminRoute>
          } />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('should show loading when permissions are loading', () => {
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
      isLoading: true,
      refreshMemberships: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin/organizations/org-1/edit']}>
        <Routes>
          <Route path="/admin/organizations/:orgId/edit" element={
            <OrgAdminRoute>
              <div>Admin Content</div>
            </OrgAdminRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('should render children for GlobalAdmin', () => {
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

    render(
      <MemoryRouter initialEntries={['/admin/organizations/org-1/edit']}>
        <Routes>
          <Route path="/admin/organizations/:orgId/edit" element={
            <OrgAdminRoute>
              <div>Admin Content</div>
            </OrgAdminRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should render children for OrgAdmin of the specific organization', () => {
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
      memberships: [],
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin/organizations/org-1/edit']}>
        <Routes>
          <Route path="/admin/organizations/:orgId/edit" element={
            <OrgAdminRoute>
              <div>Admin Content</div>
            </OrgAdminRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should redirect to home for non-OrgAdmin users', () => {
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
      isOrgAdmin: (orgId: string) => orgId === 'org-2', // Admin of different org
      isOrgMember: () => false,
      memberships: [],
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin/organizations/org-1/edit']}>
        <Routes>
          <Route path="/admin/organizations/:orgId/edit" element={
            <OrgAdminRoute>
              <div>Admin Content</div>
            </OrgAdminRoute>
          } />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('should redirect to home when orgId is missing from route', () => {
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
      isOrgAdmin: () => true,
      isOrgMember: () => false,
      memberships: [],
      isLoading: false,
      refreshMemberships: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin/some-route']}>
        <Routes>
          <Route path="/admin/some-route" element={
            <OrgAdminRoute>
              <div>Admin Content</div>
            </OrgAdminRoute>
          } />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});
