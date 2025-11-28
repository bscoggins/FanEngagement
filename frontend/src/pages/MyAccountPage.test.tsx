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

  describe('Regular User', () => {
    it('displays user account information from auth context without API call', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User' as const,
        createdAt: '2024-01-15T10:00:00Z',
      };

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByText('My Account')).toBeInTheDocument();
      });

      // Should show user info from auth context
      expect(screen.getByText(/Name:/)).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText(/Email:/)).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText(/Role:/)).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();

      // Regular users should not call the API - data comes from auth context
      expect(usersApi.getById).not.toHaveBeenCalled();
    });

    it('does not show Edit Profile button for regular users', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User' as const,
        createdAt: '2024-01-15T10:00:00Z',
      };

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByText('My Account')).toBeInTheDocument();
      });

      // Regular users should see message instead of Edit button
      expect(screen.queryByRole('button', { name: /Edit Profile/i })).not.toBeInTheDocument();
      expect(screen.getByText(/Contact an administrator to update your profile information/i)).toBeInTheDocument();
    });

    it('does not show Member Since for regular users (not available in auth context)', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User' as const,
      };

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByText('My Account')).toBeInTheDocument();
      });

      // createdAt is not available in auth context for regular users
      expect(screen.queryByText(/Member Since:/)).not.toBeInTheDocument();
    });
  });

  describe('Admin User', () => {
    it('displays admin account information from API call', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'Admin' as const,
        createdAt: '2024-01-15T10:00:00Z',
      };

      vi.mocked(usersApi.getById).mockResolvedValue(mockUser);

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByText('My Account')).toBeInTheDocument();
      });

      // Admin users should call the API
      expect(usersApi.getById).toHaveBeenCalledWith('admin-1');

      // Should show all user info including Member Since from API
      expect(screen.getByText(/Name:/)).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText(/Email:/)).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText(/Role:/)).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText(/Member Since:/)).toBeInTheDocument();
    });

    it('allows admin to edit profile information', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'Admin' as const,
        createdAt: '2024-01-15T10:00:00Z',
      };

      const updatedUser = {
        ...mockUser,
        displayName: 'Updated Admin',
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
      await user.type(nameInput, 'Updated Admin');
      
      await user.clear(emailInput);
      await user.type(emailInput, 'updated@example.com');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(usersApi.update).toHaveBeenCalledWith('admin-1', {
          displayName: 'Updated Admin',
          email: 'updated@example.com',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
      });
    });

    it('displays error message when admin update fails', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'Admin' as const,
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

    it('allows admin to cancel edit mode', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'Admin' as const,
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

    it('displays loading state for admin users', () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'Admin' as const,
        createdAt: '2024-01-15T10:00:00Z',
      };

      vi.mocked(usersApi.getById).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithAuth(mockUser);

      expect(screen.getByText('Loading account...')).toBeInTheDocument();
    });

    it('displays error message when admin user data fails to load', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'Admin' as const,
        createdAt: '2024-01-15T10:00:00Z',
      };

      vi.mocked(usersApi.getById).mockRejectedValue(new Error('Failed to load'));

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
      });
    });
  });
});
