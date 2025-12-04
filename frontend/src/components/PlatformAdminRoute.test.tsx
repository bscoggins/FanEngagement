import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlatformAdminRoute } from './PlatformAdminRoute';
import { useAuth } from '../auth/AuthContext';

// Mock the auth context
vi.mock('../auth/AuthContext');

describe('PlatformAdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

  it('shows protected content for platform admin users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'admin-1', email: 'admin@test.com', displayName: 'Admin', role: 'Admin', token: 'token', mfaRequired: false },
      token: 'token',
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      validateMfa: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <PlatformAdminRoute>
          <TestComponent />
        </PlatformAdminRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects to login for unauthenticated users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      login: vi.fn(),
      validateMfa: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/platform-admin/dashboard']}>
        <PlatformAdminRoute>
          <TestComponent />
        </PlatformAdminRoute>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to member dashboard for non-admin users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: 'user-1', email: 'user@test.com', displayName: 'User', role: 'User', token: 'token', mfaRequired: false },
      token: 'token',
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      validateMfa: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/platform-admin/dashboard']}>
        <PlatformAdminRoute>
          <TestComponent />
        </PlatformAdminRoute>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
