import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { UserEditPage } from './UserEditPage';
import { usersApi } from '../api/usersApi';
import type { User } from '../types/api';

// Mock the usersApi
vi.mock('../api/usersApi', () => ({
  usersApi: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}));

describe('UserEditPage', () => {
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

  const mockUser: User = {
    id: 'user-1',
    email: 'existing@example.com',
    displayName: 'Existing User',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const renderUserEditPage = (userId = 'user-1') => {
    return render(
      <MemoryRouter initialEntries={[`/users/${userId}/edit`]}>
        <AuthProvider>
          <Routes>
            <Route path="/users/:id/edit" element={<UserEditPage />} />
            <Route path="/users" element={<div>Users List Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    vi.mocked(usersApi.getById).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderUserEditPage();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays user data in form', async () => {
    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    
    renderUserEditPage();
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check form is populated
    expect(screen.getByLabelText(/email/i)).toHaveValue('existing@example.com');
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Existing User');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('successfully updates user and redirects', async () => {
    const updatedUser: User = {
      ...mockUser,
      email: 'updated@example.com',
      displayName: 'Updated User',
    };

    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    vi.mocked(usersApi.update).mockResolvedValueOnce(updatedUser);
    
    renderUserEditPage();
    const user = userEvent.setup();
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Update the form
    const emailInput = screen.getByLabelText(/email/i);
    const nameInput = screen.getByLabelText(/display name/i);
    
    await user.clear(emailInput);
    await user.type(emailInput, 'updated@example.com');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated User');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Wait for navigation
    await waitFor(() => {
      expect(screen.getByText('Users List Page')).toBeInTheDocument();
    });
    
    // Verify API was called with correct data
    expect(usersApi.update).toHaveBeenCalledWith('user-1', {
      email: 'updated@example.com',
      displayName: 'Updated User',
    });
  });

  it('displays error message when user not found', async () => {
    const mockError = {
      response: {
        status: 404,
      },
    };

    vi.mocked(usersApi.getById).mockRejectedValueOnce(mockError);
    
    renderUserEditPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('User not found')).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    vi.mocked(usersApi.getById).mockRejectedValueOnce(new Error('Network error'));
    
    renderUserEditPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/failed to load user/i)).toBeInTheDocument();
  });

  it('displays validation error on update failure (400)', async () => {
    const mockError = {
      response: {
        status: 400,
        data: {
          message: 'Email already in use',
        },
      },
    };

    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    vi.mocked(usersApi.update).mockRejectedValueOnce(mockError);
    
    renderUserEditPage();
    const user = userEvent.setup();
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Update email
    const emailInput = screen.getByLabelText(/email/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'duplicate@example.com');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
    });
    
    // Should stay on edit page
    expect(screen.getByText('Edit User')).toBeInTheDocument();
  });

  it('displays generic error message on network error during update', async () => {
    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    vi.mocked(usersApi.update).mockRejectedValueOnce(new Error('Network error'));
    
    renderUserEditPage();
    const user = userEvent.setup();
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Update the form
    const nameInput = screen.getByLabelText(/display name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/failed to update user/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while saving', async () => {
    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    vi.mocked(usersApi.update).mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve({
        ...mockUser,
        displayName: 'Updated User',
      }), 100));
    });
    
    renderUserEditPage();
    const user = userEvent.setup();
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Update and submit
    const nameInput = screen.getByLabelText(/display name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated User');
    
    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);
    
    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });
  });

  it('navigates back to users list when cancel is clicked', async () => {
    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    
    renderUserEditPage();
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const cancelLink = screen.getByText('Cancel');
    expect(cancelLink.closest('a')).toHaveAttribute('href', '/users');
  });
});
