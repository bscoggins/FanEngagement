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
    themePreference: authUserData.themePreference ?? authUserData.preferredTheme ?? 'Light',
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
        themePreference: 'Light' as const,
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

    it('initializes form data correctly from auth context', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User' as const,
        themePreference: 'Light' as const,
      };

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByText('My Account')).toBeInTheDocument();
      });

      // Verify that the displayed values match what was passed from auth context
      // This confirms form data is properly initialized from authUserData
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      
      // API should not be called for non-admin users
      expect(usersApi.getById).not.toHaveBeenCalled();
    });

    it('does not show Edit Profile button for regular users', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User' as const,
        themePreference: 'Light' as const,
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
        themePreference: 'Light' as const,
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
        themePreference: 'Light' as const,
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
        themePreference: 'Light' as const,
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
        themePreference: 'Light' as const,
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
        themePreference: 'Light' as const,
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
        themePreference: 'Light' as const,
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
        themePreference: 'Light' as const,
        createdAt: '2024-01-15T10:00:00Z',
      };

      vi.mocked(usersApi.getById).mockRejectedValue(new Error('Failed to load'));

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
      });
    });
  });

  describe('Theme Preference', () => {
    it('renders controls with current theme pre-selected', async () => {
      const mockUser = {
        id: 'user-2',
        email: 'theme@example.com',
        displayName: 'Theme Tester',
        role: 'User' as const,
        themePreference: 'Light' as const,
      };

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByText('Interface Theme')).toBeInTheDocument();
      });

      expect(screen.getByTestId('theme-light-button')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('theme-dark-button')).toHaveAttribute('aria-pressed', 'false');
    });

    it('updates theme preference when toggled', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: 'user-2',
        email: 'theme@example.com',
        displayName: 'Theme Tester',
        role: 'User' as const,
        themePreference: 'Light' as const,
      };

      vi.mocked(usersApi.updateMyThemePreference).mockResolvedValue({ themePreference: 'Dark' });

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByTestId('theme-dark-button')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('theme-dark-button'));

      await waitFor(() => {
        expect(usersApi.updateMyThemePreference).toHaveBeenCalledWith({ themePreference: 'Dark' });
      });

      await waitFor(() => {
        expect(screen.getByText('Dark mode enabled')).toBeInTheDocument();
      });

      expect(screen.getByTestId('theme-dark-button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows inline error when update fails', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: 'user-2',
        email: 'theme@example.com',
        displayName: 'Theme Tester',
        role: 'User' as const,
        themePreference: 'Light' as const,
      };

      vi.mocked(usersApi.updateMyThemePreference).mockRejectedValue({
        response: { data: { message: 'Unable to save preference' } },
      });

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByTestId('theme-dark-button')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('theme-dark-button'));

      await waitFor(() => {
        expect(screen.getByTestId('theme-error')).toHaveTextContent('Unable to save preference');
      });
    });
  });

  describe('Password Change', () => {
    it('displays password change form for all users', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User' as const,
        themePreference: 'Light' as const,
      };

      renderWithAuth(mockUser);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Check that password change elements are present
      expect(
        screen.getByRole('heading', { name: /change password/i, level: 2 })
      ).toBeInTheDocument();
      expect(screen.getByTestId('password-change-form')).toBeInTheDocument();
      expect(screen.getByTestId('current-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('change-password-button')).toBeInTheDocument();
    });

    it('successfully changes password with valid inputs', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User' as const,
        themePreference: 'Light' as const,
      };

      vi.mocked(usersApi.changeMyPassword).mockResolvedValue({ message: 'Password changed successfully' });

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByTestId('password-change-form')).toBeInTheDocument();
      });

      // Fill in the form
      await user.type(screen.getByTestId('current-password-input'), 'OldPassword123!');
      await user.type(screen.getByTestId('new-password-input'), 'NewPassword456!');
      await user.type(screen.getByTestId('confirm-password-input'), 'NewPassword456!');

      // Submit
      await user.click(screen.getByTestId('change-password-button'));

      await waitFor(() => {
        expect(usersApi.changeMyPassword).toHaveBeenCalledWith({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        });
      });

      // Check success notification appears
      await waitFor(() => {
        expect(screen.getByText('Password changed successfully!')).toBeInTheDocument();
      });

      // Form should be cleared
      expect(screen.getByTestId('current-password-input')).toHaveValue('');
      expect(screen.getByTestId('new-password-input')).toHaveValue('');
      expect(screen.getByTestId('confirm-password-input')).toHaveValue('');
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User' as const,
        themePreference: 'Light' as const,
      };

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByTestId('password-change-form')).toBeInTheDocument();
      });

      // Fill in the form with mismatched passwords
      await user.type(screen.getByTestId('current-password-input'), 'OldPassword123!');
      await user.type(screen.getByTestId('new-password-input'), 'NewPassword456!');
      await user.type(screen.getByTestId('confirm-password-input'), 'DifferentPassword789!');

      // Submit
      await user.click(screen.getByTestId('change-password-button'));

      await waitFor(() => {
        expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
      });

      // Should not call the API
      expect(usersApi.changeMyPassword).not.toHaveBeenCalled();
    });

    it('shows error when new password is too short', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User' as const,
      };

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByTestId('password-change-form')).toBeInTheDocument();
      });

      // Fill in the form with short password
      await user.type(screen.getByTestId('current-password-input'), 'OldPassword123!');
      await user.type(screen.getByTestId('new-password-input'), 'short');
      await user.type(screen.getByTestId('confirm-password-input'), 'short');

      // Submit
      await user.click(screen.getByTestId('change-password-button'));

      await waitFor(() => {
        expect(screen.getByText('New password must be at least 8 characters long')).toBeInTheDocument();
      });

      // Should not call the API
      expect(usersApi.changeMyPassword).not.toHaveBeenCalled();
    });

    it('shows error message when API call fails', async () => {
      const user = userEvent.setup();
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'User' as const,
      };

      vi.mocked(usersApi.changeMyPassword).mockRejectedValue({
        response: { data: { message: 'Current password is incorrect' } }
      });

      renderWithAuth(mockUser);

      await waitFor(() => {
        expect(screen.getByTestId('password-change-form')).toBeInTheDocument();
      });

      // Fill in the form
      await user.type(screen.getByTestId('current-password-input'), 'WrongPassword123!');
      await user.type(screen.getByTestId('new-password-input'), 'NewPassword456!');
      await user.type(screen.getByTestId('confirm-password-input'), 'NewPassword456!');

      // Submit
      await user.click(screen.getByTestId('change-password-button'));

      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent(
          /Current password is incorrect/i
        );
      });
    });
  });
});
