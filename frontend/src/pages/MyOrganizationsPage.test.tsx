import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { MyOrganizationsPage } from './MyOrganizationsPage';
import { membershipsApi } from '../api/membershipsApi';

vi.mock('../api/membershipsApi');

const renderWithAuth = (userId: string) => {
  const mockUser = {
    token: 'test-token',
    userId,
    email: 'user@example.com',
    displayName: 'Test User',
    role: 'User',
  };
  
  localStorage.setItem('authToken', mockUser.token);
  localStorage.setItem('authUser', JSON.stringify(mockUser));

  return render(
    <MemoryRouter>
      <AuthProvider>
        <MyOrganizationsPage />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('MyOrganizationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('displays list of user memberships', async () => {
    const mockMemberships = [
      {
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Test Organization 1',
        userId: 'user-1',
        role: 'Member' as const,
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 'membership-2',
        organizationId: 'org-2',
        organizationName: 'Test Organization 2',
        userId: 'user-1',
        role: 'OrgAdmin' as const,
        createdAt: '2024-02-01T12:00:00Z',
      },
    ];

    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);

    renderWithAuth('user-1');

    await waitFor(() => {
      expect(screen.getByText('My Organizations')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Organization 1')).toBeInTheDocument();
    expect(screen.getByText('Test Organization 2')).toBeInTheDocument();
    expect(screen.getAllByText(/Member/i)).toHaveLength(1);
    expect(screen.getByText(/OrgAdmin/i)).toBeInTheDocument();
  });

  it('displays message when user has no memberships', async () => {
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);

    renderWithAuth('user-1');

    await waitFor(() => {
      expect(screen.getByText('My Organizations')).toBeInTheDocument();
    });

    expect(
      screen.getByText('You are not a member of any organizations yet.')
    ).toBeInTheDocument();
  });

  it('displays loading state', () => {
    vi.mocked(membershipsApi.getByUserId).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithAuth('user-1');

    expect(screen.getByText('Loading your organizations...')).toBeInTheDocument();
  });

  it('displays error message when memberships fail to load', async () => {
    vi.mocked(membershipsApi.getByUserId).mockRejectedValue(
      new Error('Network error')
    );

    renderWithAuth('user-1');

    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection.')).toBeInTheDocument();
    });
  });

  it('renders links to organization details', async () => {
    const mockMemberships = [
      {
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Test Organization',
        userId: 'user-1',
        role: 'Member' as const,
        createdAt: '2024-01-15T10:00:00Z',
      },
    ];

    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);

    renderWithAuth('user-1');

    await waitFor(() => {
      expect(screen.getByText('My Organizations')).toBeInTheDocument();
    });

    const links = screen.getAllByRole('link', { name: /Test Organization|View Details/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', '/me/organizations/org-1');
  });
});
