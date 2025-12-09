import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { LoginPage } from '../pages/LoginPage';
import { authApi } from '../api/authApi';
import { membershipsApi } from '../api/membershipsApi';

// Mock the authApi
vi.mock('../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
      validateMfa: vi.fn(),
  },
}));

// Mock the membershipsApi
vi.mock('../api/membershipsApi', () => ({
  membershipsApi: {
    getByUserId: vi.fn(),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Suppress console.error from LoginPage error logging for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Default memberships mock - regular member
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);
  });
  
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderLoginPage = (initialRoute = '/login') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <NotificationProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<div>Admin Page</div>} />
              <Route path="/platform-admin/dashboard" element={<div>Platform Admin Dashboard</div>} />
              <Route path="/me/home" element={<div>Member Dashboard</div>} />
            </Routes>
          </AuthProvider>
        </NotificationProvider>
      </MemoryRouter>
    );
  };

  it('renders login form with email and password fields', () => {
    renderLoginPage();
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('redirects non-admin user to member dashboard after login', async () => {
    const mockResponse = {
      token: 'test-token',
      userId: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'User' as const,
      mfaRequired: false,
    };

    vi.mocked(authApi.login).mockResolvedValueOnce(mockResponse);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValueOnce([]);

    renderLoginPage();
    const user = userEvent.setup();

    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // Wait for navigation to member dashboard
    await waitFor(() => {
      expect(screen.getByText('Member Dashboard')).toBeInTheDocument();
    });

    // Verify token is stored
    expect(localStorage.getItem('authToken')).toBe('test-token');
    expect(localStorage.getItem('authUser')).toBeTruthy();
  });

  it('redirects platform admin to platform admin dashboard after login', async () => {
    const mockResponse = {
      token: 'test-token',
      userId: 'admin-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin' as const,
      mfaRequired: false,
    };

    vi.mocked(authApi.login).mockResolvedValueOnce(mockResponse);

    renderLoginPage();
    const user = userEvent.setup();

    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // Wait for navigation to platform admin dashboard
    await waitFor(() => {
      expect(screen.getByText('Platform Admin Dashboard')).toBeInTheDocument();
    });
  });

  it('redirects OrgAdmin user to admin dashboard after login', async () => {
    const mockResponse = {
      token: 'test-token',
      userId: 'orgadmin-123',
      email: 'orgadmin@example.com',
      displayName: 'OrgAdmin User',
      role: 'User' as const,
      mfaRequired: false,
    };

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

    vi.mocked(authApi.login).mockResolvedValueOnce(mockResponse);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValueOnce(mockMemberships);

    renderLoginPage();
    const user = userEvent.setup();

    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'orgadmin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // Wait for navigation to admin dashboard
    await waitFor(() => {
      expect(screen.getByText('Admin Page')).toBeInTheDocument();
    });
  });

  it('displays error message for invalid credentials', async () => {
    const mockError = {
      response: {
        status: 401,
      },
    };

    vi.mocked(authApi.login).mockRejectedValueOnce(mockError);

    renderLoginPage();
    const user = userEvent.setup();

    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });

    // Verify user stays on login page
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('displays error message for network errors', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new Error('Network error'));

    renderLoginPage();
    const user = userEvent.setup();

    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // Wait for error message - shows generic error message for network errors
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('redirects already authenticated non-admin user to member dashboard', async () => {
    // Simulate existing auth session for regular user
    localStorage.setItem('authToken', 'existing-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'existing-token',
      userId: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'User',
      mfaRequired: false,
    }));
    vi.mocked(membershipsApi.getByUserId).mockResolvedValueOnce([]);

    renderLoginPage();

    // Should redirect to member dashboard
    await waitFor(() => {
      expect(screen.getByText('Member Dashboard')).toBeInTheDocument();
    });
  });

  it('redirects already authenticated admin user to platform admin dashboard', async () => {
    // Simulate existing auth session for admin user
    localStorage.setItem('authToken', 'existing-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'existing-token',
      userId: 'admin-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin',
      mfaRequired: false,
    }));

    renderLoginPage();

    // Should redirect to platform admin dashboard
    await waitFor(() => {
      expect(screen.getByText('Platform Admin Dashboard')).toBeInTheDocument();
    });
  });

  it('disables submit button while logging in', async () => {
    vi.mocked(authApi.login).mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve({
        token: 'test-token',
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'User' as const,
      mfaRequired: false,
      }), 100));
    });

    renderLoginPage();
    const user = userEvent.setup();

    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    // Button should be disabled and show aria-busy while loading
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /log in/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });
});
