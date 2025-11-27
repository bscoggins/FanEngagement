import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { NotificationContainer } from '../components/NotificationContainer';
import { MyAccountPage } from './MyAccountPage';
import { usersApi } from '../api/usersApi';

vi.mock('../api/usersApi');

const renderWithAuth = (authUserData: any) => {
  // Mock localStorage
  const mockUser = {
    token: 'test-token',
    userId: authUserData.id,
    email: authUserData.email,
    displayName: authUserData.displayName,
    role: authUserData.role,
  };
  
  localStorage.setItem('authToken', mockUser.token);
  localStorage.setItem('authUser', JSON.stringify(mockUser));

  return render(
    <NotificationProvider>
      <MemoryRouter>
        <NotificationContainer />
        <AuthProvider>
          <MyAccountPage />
        </AuthProvider>
      </MemoryRouter>
    </NotificationProvider>
  );
};

describe('MyAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('displays user account information', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'User' as const,
      createdAt: '2024-01-15T10:00:00Z',
    };

    vi.mocked(usersApi.getById).mockResolvedValue(mockUser);

    renderWithAuth(mockUser);

    await waitFor(() => {
      expect(screen.getByText('My Account')).toBeInTheDocument();
    });

    expect(screen.getByText(/Name:/)).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText(/Email:/)).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Role:/)).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('allows editing profile information', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'User' as const,
      createdAt: '2024-01-15T10:00:00Z',
    };

    const updatedUser = {
      ...mockUser,
      displayName: 'Updated Name',
      email: 'updated@example.com',
    };

    vi.mocked(usersApi.getById).mockResolvedValue(mockUser);
    vi.mocked(usersApi.update).mockResolvedValue(updatedUser);

    renderWithAuth(mockUser);

    await waitFor(() => {
      expect(screen.getByText('My Account')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByRole('button', { name: /Edit Profile/i });
    await user.click(editButton);

    // Update fields
    const nameInput = screen.getByLabelText(/Name:/i);
    const emailInput = screen.getByLabelText(/Email:/i);

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');
    
    await user.clear(emailInput);
    await user.type(emailInput, 'updated@example.com');

    // Submit form
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(usersApi.update).toHaveBeenCalledWith('user-1', {
        displayName: 'Updated Name',
        email: 'updated@example.com',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    });
  });

  it('displays error message when update fails', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'User' as const,
      createdAt: '2024-01-15T10:00:00Z',
    };

    vi.mocked(usersApi.getById).mockResolvedValue(mockUser);
    vi.mocked(usersApi.update).mockRejectedValue({
      response: { data: { message: 'Email already in use' } },
    });

    renderWithAuth(mockUser);

    await waitFor(() => {
      expect(screen.getByText('My Account')).toBeInTheDocument();
    });

    // Click edit and try to save
    await user.click(screen.getByRole('button', { name: /Edit Profile/i }));
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Email already in use').length).toBeGreaterThan(0);
    });
  });

  it('allows canceling edit mode', async () => {
    const user = userEvent.setup();
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'User' as const,
      createdAt: '2024-01-15T10:00:00Z',
    };

    vi.mocked(usersApi.getById).mockResolvedValue(mockUser);

    renderWithAuth(mockUser);

    await waitFor(() => {
      expect(screen.getByText('My Account')).toBeInTheDocument();
    });

    // Click edit button
    await user.click(screen.getByRole('button', { name: /Edit Profile/i }));

    // Verify in edit mode
    expect(screen.getByLabelText(/Name:/i)).toBeInTheDocument();

    // Click cancel
    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    // Should be back in view mode
    expect(screen.getByRole('button', { name: /Edit Profile/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Name:/i)).not.toBeInTheDocument();
  });

  it('displays loading state', () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'User' as const,
      createdAt: '2024-01-15T10:00:00Z',
    };

    vi.mocked(usersApi.getById).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithAuth(mockUser);

    expect(screen.getByText('Loading account...')).toBeInTheDocument();
  });

  it('displays error message when user fails to load', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      role: 'User' as const,
      createdAt: '2024-01-15T10:00:00Z',
    };

    vi.mocked(usersApi.getById).mockRejectedValue(new Error('Failed to load'));

    renderWithAuth(mockUser);

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });
});
