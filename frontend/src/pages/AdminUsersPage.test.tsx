import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminUsersPage } from './AdminUsersPage';
import { usersApi } from '../api/usersApi';
import type { User } from '../types/api';

// Mock the usersApi
vi.mock('../api/usersApi', () => ({
  usersApi: {
    getAll: vi.fn(),
  },
}));

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUsers: User[] = [
    {
      id: 'user-1',
      email: 'user1@example.com',
      displayName: 'User One',
      role: 'User',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin',
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  const renderAdminUsersPage = () => {
    return render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
  };

  it('renders user management heading', () => {
    vi.mocked(usersApi.getAll).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderAdminUsersPage();
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(usersApi.getAll).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderAdminUsersPage();
    
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  });

  it('displays users list after loading', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderAdminUsersPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check that users are displayed
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
  });

  it('displays user roles correctly', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderAdminUsersPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check roles are displayed
    const roleBadges = screen.getAllByText(/User|Admin/);
    expect(roleBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('displays edit links for each user', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderAdminUsersPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const editLinks = screen.getAllByText('Edit');
    expect(editLinks).toHaveLength(2);
    expect(editLinks[0].closest('a')).toHaveAttribute('href', '/admin/users/user-1');
    expect(editLinks[1].closest('a')).toHaveAttribute('href', '/admin/users/user-2');
  });

  it('displays create user button', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderAdminUsersPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const createButton = screen.getByText('Create User');
    expect(createButton.closest('a')).toHaveAttribute('href', '/users/new');
  });

  it('displays error message when API call fails', async () => {
    vi.mocked(usersApi.getAll).mockRejectedValueOnce(new Error('Network error'));
    
    renderAdminUsersPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
  });

  it('displays empty state when no users exist', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce([]);
    
    renderAdminUsersPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });
});
