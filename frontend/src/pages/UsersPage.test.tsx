import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { UsersPage } from './UsersPage';
import { usersApi } from '../api/usersApi';
import type { User } from '../types/api';

// Mock the usersApi
vi.mock('../api/usersApi', () => ({
  usersApi: {
    getAll: vi.fn(),
  },
}));

describe('UsersPage', () => {
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

  const renderUsersPage = () => {
    return render(
      <MemoryRouter initialEntries={['/users']}>
        <AuthProvider>
          <Routes>
            <Route path="/users" element={<UsersPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  const mockUsers: User[] = [
    {
      id: '1',
      email: 'user1@example.com',
      displayName: 'User One',
      role: 'User',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      email: 'user2@example.com',
      displayName: 'User Two',
      role: 'Admin',
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  it('renders loading state initially', () => {
    vi.mocked(usersApi.getAll).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderUsersPage();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders users list successfully', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderUsersPage();
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check table headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Created At')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    
    // Check user data
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    
    // Check Edit links
    const editLinks = screen.getAllByText('Edit');
    expect(editLinks).toHaveLength(2);
  });

  it('renders Create User button', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderUsersPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const createButton = screen.getByText('Create User');
    expect(createButton).toBeInTheDocument();
    expect(createButton.closest('a')).toHaveAttribute('href', '/users/new');
  });

  it('renders empty state when no users exist', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce([]);
    
    renderUsersPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('displays error message when API call fails', async () => {
    vi.mocked(usersApi.getAll).mockRejectedValueOnce(new Error('Network error'));
    
    renderUsersPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/failed to load users/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('edit links point to correct user edit page', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderUsersPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const editLinks = screen.getAllByText('Edit');
    expect(editLinks[0].closest('a')).toHaveAttribute('href', '/users/1/edit');
    expect(editLinks[1].closest('a')).toHaveAttribute('href', '/users/2/edit');
  });
});
