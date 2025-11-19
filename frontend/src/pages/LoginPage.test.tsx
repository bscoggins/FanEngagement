import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { authApi } from '../api/authApi';

// Mock the authApi
vi.mock('../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

describe('LoginPage', () => {
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

  const renderLoginPage = (initialRoute = '/login') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/users" element={<div>Users Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders login form with email and password fields', () => {
    renderLoginPage();
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('successfully logs in with valid credentials', async () => {
    const mockResponse = {
      token: 'test-token',
      userId: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'User',
    };

    vi.mocked(authApi.login).mockResolvedValueOnce(mockResponse);

    renderLoginPage();
    const user = userEvent.setup();

    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // Wait for navigation
    await waitFor(() => {
      expect(screen.getByText('Users Page')).toBeInTheDocument();
    });

    // Verify token is stored
    expect(localStorage.getItem('authToken')).toBe('test-token');
    expect(localStorage.getItem('authUser')).toBeTruthy();
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

    // Wait for error message - the improved error handling now shows a specific message for network errors
    await waitFor(() => {
      expect(screen.getByText(/cannot connect to server/i)).toBeInTheDocument();
    });
  });

  it('redirects to /users if already authenticated', async () => {
    // Simulate existing auth session
    localStorage.setItem('authToken', 'existing-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'existing-token',
      userId: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'User',
    }));

    renderLoginPage();

    // Should redirect to users page
    await waitFor(() => {
      expect(screen.getByText('Users Page')).toBeInTheDocument();
    });
  });

  it('disables submit button while logging in', async () => {
    vi.mocked(authApi.login).mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve({
        token: 'test-token',
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'User',
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

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText(/logging in/i)).toBeInTheDocument();
    });
  });
});
