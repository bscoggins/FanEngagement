import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { UserCreatePage } from './UserCreatePage';
import { usersApi } from '../api/usersApi';
import type { User } from '../types/api';

// Mock the usersApi
vi.mock('../api/usersApi', () => ({
  usersApi: {
    create: vi.fn(),
  },
}));

describe('UserCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up authenticated state
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'test-token',
      userId: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    }));
  });

  const renderUserCreatePage = (initialPath = '/users/new') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthProvider>
          <Routes>
            <Route path="/users/new" element={<UserCreatePage />} />
            <Route path="/admin/users/new" element={<UserCreatePage />} />
            <Route path="/users" element={<div>Users List Page</div>} />
            <Route path="/admin/users" element={<div>Admin Users List Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders create user form', () => {
    renderUserCreatePage();
    
    expect(screen.getByRole('heading', { name: 'Create User' })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });

  it('successfully creates a user and redirects', async () => {
    const mockUser: User = {
      id: 'new-user-id',
      email: 'newuser@example.com',
      displayName: 'New User',
      role: 'User',
      createdAt: '2024-01-03T00:00:00Z',
    };

    vi.mocked(usersApi.create).mockResolvedValueOnce(mockUser);
    
    renderUserCreatePage();
    const user = userEvent.setup();
    
    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.type(screen.getByLabelText(/display name/i), 'New User');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    // Wait for navigation
    await waitFor(() => {
      expect(screen.getByText('Users List Page')).toBeInTheDocument();
    });
    
    // Verify API was called with correct data
    expect(usersApi.create).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'Password123!',
      displayName: 'New User',
    });
  });

  it('redirects to admin users list when rendered within admin route', async () => {
    const mockUser: User = {
      id: 'new-user-id',
      email: 'adminnew@example.com',
      displayName: 'Admin New User',
      role: 'User',
      createdAt: '2024-01-03T00:00:00Z',
    };

    vi.mocked(usersApi.create).mockResolvedValueOnce(mockUser);

    renderUserCreatePage('/admin/users/new');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'adminnew@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.type(screen.getByLabelText(/display name/i), 'Admin New User');

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Admin Users List Page')).toBeInTheDocument();
    });

    expect(usersApi.create).toHaveBeenCalledWith({
      email: 'adminnew@example.com',
      password: 'Password123!',
      displayName: 'Admin New User',
    });
  });

  it('displays error message on validation error (400)', async () => {
    const mockError = {
      response: {
        status: 400,
        data: {
          message: 'Email already exists',
        },
      },
    };

    vi.mocked(usersApi.create).mockRejectedValueOnce(mockError);
    
    renderUserCreatePage();
    const user = userEvent.setup();
    
    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.type(screen.getByLabelText(/display name/i), 'Test User');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
    
    // Should stay on create page
    expect(screen.getByRole('heading', { name: 'Create User' })).toBeInTheDocument();
  });

  it('displays generic error message on network error', async () => {
    vi.mocked(usersApi.create).mockRejectedValueOnce(new Error('Network error'));
    
    renderUserCreatePage();
    const user = userEvent.setup();
    
    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.type(screen.getByLabelText(/display name/i), 'New User');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('shows validation errors and prevents submit when password is too short', async () => {
    renderUserCreatePage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'short@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Abc1!');
    await user.type(screen.getByLabelText(/display name/i), 'Short Password');

    await user.click(screen.getByRole('button', { name: /create user/i }));

    const summary = await screen.findByTestId('form-error-summary');
    expect(summary).toHaveTextContent('Password must be at least 12 characters');
    expect(usersApi.create).not.toHaveBeenCalled();
  });

  it('shows validation errors and prevents submit when password lacks required character types', async () => {
    renderUserCreatePage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'invalid@example.com');
    await user.type(screen.getByLabelText(/password/i), 'passwordonly');
    await user.type(screen.getByLabelText(/display name/i), 'Invalid Password');

    await user.click(screen.getByRole('button', { name: /create user/i }));

    const summary = await screen.findByTestId('form-error-summary');
    expect(summary).toHaveTextContent(
      'Password must contain at least one uppercase letter, one number, and one special character'
    );
    expect(usersApi.create).not.toHaveBeenCalled();
  });

  it('disables submit button while creating', async () => {
    vi.mocked(usersApi.create).mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve({
        id: 'new-user-id',
        email: 'newuser@example.com',
        displayName: 'New User',
        role: 'User',
        createdAt: '2024-01-03T00:00:00Z',
      }), 100));
    });
    
    renderUserCreatePage();
    const user = userEvent.setup();
    
    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.type(screen.getByLabelText(/display name/i), 'New User');
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create user/i });
    await user.click(submitButton);
    
    // Button should be disabled and show aria-busy while loading
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /create user/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });

  it('navigates back to users list when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderUserCreatePage();
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    // Should navigate to /users route which shows "Users List Page"
    await waitFor(() => {
      expect(screen.getByText('Users List Page')).toBeInTheDocument();
    });
  });
});
