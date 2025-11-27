import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlatformAdminDashboardPage } from './PlatformAdminDashboardPage';
import { usersApi } from '../api/usersApi';
import { organizationsApi } from '../api/organizationsApi';
import type { User, Organization } from '../types/api';

// Mock API modules
vi.mock('../api/usersApi');
vi.mock('../api/organizationsApi');

describe('PlatformAdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUsers: User[] = [
    { id: 'user-1', email: 'user1@test.com', displayName: 'User 1', role: 'User', createdAt: '2024-01-01' },
    { id: 'user-2', email: 'user2@test.com', displayName: 'User 2', role: 'Admin', createdAt: '2024-01-01' },
    { id: 'user-3', email: 'user3@test.com', displayName: 'User 3', role: 'User', createdAt: '2024-01-01' },
  ];

  const mockOrganizations: Organization[] = [
    { id: 'org-1', name: 'Org 1', createdAt: '2024-01-01' },
    { id: 'org-2', name: 'Org 2', createdAt: '2024-01-01' },
  ];

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <PlatformAdminDashboardPage />
      </MemoryRouter>
    );
  };

  it('renders platform overview heading', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValue(mockUsers);
    vi.mocked(organizationsApi.getAll).mockResolvedValue(mockOrganizations);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('platform-overview-heading')).toBeInTheDocument();
    });
    expect(screen.getByText('Platform Overview')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(usersApi.getAll).mockReturnValue(new Promise(() => {})); // Never resolves
    vi.mocked(organizationsApi.getAll).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText('Loading platform statistics...')).toBeInTheDocument();
  });

  it('displays user count', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValue(mockUsers);
    vi.mocked(organizationsApi.getAll).mockResolvedValue(mockOrganizations);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('users-stat-card')).toBeInTheDocument();
    });
    expect(screen.getByText('3')).toBeInTheDocument(); // 3 users
    expect(screen.getByText('Total Users')).toBeInTheDocument();
  });

  it('displays organization count', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValue(mockUsers);
    vi.mocked(organizationsApi.getAll).mockResolvedValue(mockOrganizations);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('organizations-stat-card')).toBeInTheDocument();
    });
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 organizations
    expect(screen.getByText('Total Organizations')).toBeInTheDocument();
  });

  it('displays quick action cards', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValue(mockUsers);
    vi.mocked(organizationsApi.getAll).mockResolvedValue(mockOrganizations);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('manage-users-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('manage-organizations-card')).toBeInTheDocument();
    expect(screen.getByTestId('dev-tools-card')).toBeInTheDocument();
  });

  it('has correct navigation links', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValue(mockUsers);
    vi.mocked(organizationsApi.getAll).mockResolvedValue(mockOrganizations);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('manage-users-card')).toBeInTheDocument();
    });

    const usersLink = screen.getByTestId('manage-users-card').closest('a');
    const orgsLink = screen.getByTestId('manage-organizations-card').closest('a');
    const devToolsLink = screen.getByTestId('dev-tools-card').closest('a');

    expect(usersLink).toHaveAttribute('href', '/admin/users');
    expect(orgsLink).toHaveAttribute('href', '/admin/organizations');
    expect(devToolsLink).toHaveAttribute('href', '/admin/dev-tools');
  });

  it('displays platform admin info banner', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValue(mockUsers);
    vi.mocked(organizationsApi.getAll).mockResolvedValue(mockOrganizations);

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('platform-admin-info')).toBeInTheDocument();
    });
    expect(screen.getByText(/Platform Administrator Access/i)).toBeInTheDocument();
  });

  it('displays error message when API fails', async () => {
    vi.mocked(usersApi.getAll).mockRejectedValue(new Error('Network error'));
    vi.mocked(organizationsApi.getAll).mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Retry/i)).toBeInTheDocument();
    });
  });

  it('displays coming soon indicators for placeholder metrics', async () => {
    vi.mocked(usersApi.getAll).mockResolvedValue([]);
    vi.mocked(organizationsApi.getAll).mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Coming Soon')).toHaveLength(2);
    });
    expect(screen.getAllByText('Platform-wide aggregation pending')).toHaveLength(2);
  });
});
