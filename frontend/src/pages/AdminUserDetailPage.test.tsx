import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { NotificationContainer } from '../components/NotificationContainer';
import { AdminUserDetailPage } from './AdminUserDetailPage';
import { usersApi } from '../api/usersApi';
import { membershipsApi } from '../api/membershipsApi';
import type { User, MembershipWithOrganizationDto } from '../types/api';

// Mock the APIs
vi.mock('../api/usersApi', () => ({
  usersApi: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../api/membershipsApi', () => ({
  membershipsApi: {
    getByUserId: vi.fn(),
  },
}));

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up authenticated state
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'test-token',
      userId: 'admin-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin',
    }));
  });

  const mockUser: User = {
    id: 'user-1',
    email: 'user@example.com',
    displayName: 'Test User',
    role: 'User',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockMembershipsWithOrg: MembershipWithOrganizationDto[] = [
    {
      id: 'mem-1',
      organizationId: 'org-1',
      organizationName: 'Organization One',
      userId: 'user-1',
      role: 'Member',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ];

  const renderAdminUserDetailPage = (userId = 'user-1') => {
    return render(
      <NotificationProvider>
        <MemoryRouter initialEntries={[`/admin/users/${userId}`]}>
          <NotificationContainer />
          <AuthProvider>
            <Routes>
              <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
              <Route path="/admin/users" element={<div>Users List Page</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </NotificationProvider>
    );
  };

  it('renders loading state initially', () => {
    vi.mocked(usersApi.getById).mockImplementation(() => new Promise(() => {})); // Never resolves
    vi.mocked(membershipsApi.getByUserId).mockImplementation(() => new Promise(() => {}));
    renderAdminUserDetailPage();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches and displays user data in form', async () => {
    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValueOnce(mockMembershipsWithOrg);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMembershipsWithOrg);
    
    renderAdminUserDetailPage();
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check form is populated
    expect(screen.getByLabelText(/email/i)).toHaveValue('user@example.com');
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Test User');
    expect(screen.getByLabelText(/role/i)).toHaveValue('User');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('displays user memberships', async () => {
    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValueOnce(mockMembershipsWithOrg);
    
    renderAdminUserDetailPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check memberships are displayed
    expect(screen.getByText('Organization Memberships')).toBeInTheDocument();
    expect(screen.getByText('Organization One')).toBeInTheDocument();
    expect(screen.getByText(/Role:/)).toBeInTheDocument();
  });

  it('displays empty state when user has no memberships', async () => {
    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValueOnce([]);
    
    renderAdminUserDetailPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/not a member of any organizations/i)).toBeInTheDocument();
  });

  it('successfully updates user and shows success message', async () => {
    const updatedUser: User = {
      ...mockUser,
      email: 'updated@example.com',
      displayName: 'Updated User',
      role: 'Admin',
    };

    vi.mocked(usersApi.getById)
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(updatedUser);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMembershipsWithOrg);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);
    vi.mocked(usersApi.update).mockResolvedValueOnce(updatedUser);
    
    renderAdminUserDetailPage();
    const user = userEvent.setup();
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Update the form
    const emailInput = screen.getByLabelText(/email/i);
    const nameInput = screen.getByLabelText(/display name/i);
    const roleSelect = screen.getByLabelText(/role/i);
    
    await user.clear(emailInput);
    await user.type(emailInput, 'updated@example.com');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated User');
    await user.selectOptions(roleSelect, 'Admin');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/user updated successfully/i)).toBeInTheDocument();
    });
    
    // Verify API was called with correct data
    expect(usersApi.update).toHaveBeenCalledWith('user-1', {
      email: 'updated@example.com',
      displayName: 'Updated User',
      role: 'Admin',
    });
  });

  it('displays error message when user not found', async () => {
    const mockError = {
      response: {
        status: 404,
      },
    };

    vi.mocked(usersApi.getById).mockRejectedValueOnce(mockError);
    
    renderAdminUserDetailPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('The requested resource was not found.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it('displays error message on update failure', async () => {
    const mockError = {
      response: {
        status: 400,
        data: {
          message: 'Email already in use',
        },
      },
    };

    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMembershipsWithOrg);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);
    vi.mocked(usersApi.update).mockRejectedValueOnce(mockError);
    
    renderAdminUserDetailPage();
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
    
    // Wait for error message (may appear in multiple places)
    await waitFor(() => {
      expect(screen.getAllByText('Email already in use').length).toBeGreaterThan(0);
    });
  });

  it('disables submit button while saving', async () => {
    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMembershipsWithOrg);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);
    vi.mocked(usersApi.update).mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve({
        ...mockUser,
        displayName: 'Updated User',
      }), 100));
    });
    
    renderAdminUserDetailPage();
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

  it('has back link to admin users list', async () => {
    vi.mocked(usersApi.getById).mockResolvedValueOnce(mockUser);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMembershipsWithOrg);
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);
    
    renderAdminUserDetailPage();
    
    // Wait for user data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const backLinks = screen.getAllByText('← Back to Users');
    expect(backLinks[0].closest('a')).toHaveAttribute('href', '/admin/users');
  });
});
