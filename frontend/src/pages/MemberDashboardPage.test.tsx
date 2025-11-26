import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { MemberDashboardPage } from '../pages/MemberDashboardPage';
import { membershipsApi } from '../api/membershipsApi';
import { proposalsApi } from '../api/proposalsApi';

// Mock the APIs
vi.mock('../api/membershipsApi', () => ({
  membershipsApi: {
    getByUserId: vi.fn(),
  },
}));

vi.mock('../api/proposalsApi', () => ({
  proposalsApi: {
    getByOrganization: vi.fn(),
  },
}));

describe('MemberDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Suppress console warnings for cleaner test output
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const setupAuthenticatedUser = (role: 'User' | 'Admin' = 'User') => {
    const mockUser = {
      token: 'test-token',
      userId: 'user-123',
      email: 'alice@example.com',
      displayName: 'Alice Smith',
      role,
    };
    localStorage.setItem('authToken', mockUser.token);
    localStorage.setItem('authUser', JSON.stringify(mockUser));
    return mockUser;
  };

  const renderDashboard = () => {
    return render(
      <MemoryRouter initialEntries={['/me/home']}>
        <NotificationProvider>
          <AuthProvider>
            <Routes>
              <Route path="/me/home" element={<MemberDashboardPage />} />
              <Route path="/me/organizations/:orgId" element={<div>Org Detail Page</div>} />
              <Route path="/me/proposals/:proposalId" element={<div>Proposal Page</div>} />
            </Routes>
          </AuthProvider>
        </NotificationProvider>
      </MemoryRouter>
    );
  };

  it('renders loading state initially', async () => {
    setupAuthenticatedUser();
    vi.mocked(membershipsApi.getByUserId).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
    );

    renderDashboard();

    expect(screen.getByText(/loading your dashboard/i)).toBeInTheDocument();
  });

  it('renders welcome message with user display name', async () => {
    const user = setupAuthenticatedUser();
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('welcome-message')).toHaveTextContent(`Welcome, ${user.displayName}!`);
    });
  });

  it('renders dashboard sections (Organizations, Active Proposals, Account)', async () => {
    setupAuthenticatedUser();
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('member-dashboard')).toBeInTheDocument();
    });

    expect(screen.getByTestId('organizations-card')).toBeInTheDocument();
    expect(screen.getByTestId('active-proposals-card')).toBeInTheDocument();
    expect(screen.getByTestId('account-card')).toBeInTheDocument();
  });

  it('displays empty state when user has no organizations', async () => {
    setupAuthenticatedUser();
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('no-organizations')).toBeInTheDocument();
    });

    expect(screen.getByText(/you are not a member of any organizations/i)).toBeInTheDocument();
    expect(screen.getByTestId('getting-started-section')).toBeInTheDocument();
  });

  it('displays organizations when user has memberships', async () => {
    setupAuthenticatedUser();
    const mockMemberships = [
      {
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Test Organization',
        userId: 'user-123',
        role: 'Member' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
    });

    expect(screen.getByText(/you are a member of/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Count
  });

  it('displays active proposals when available', async () => {
    setupAuthenticatedUser();
    const mockMemberships = [
      {
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Test Organization',
        userId: 'user-123',
        role: 'Member' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];
    const mockProposals = [
      {
        id: 'proposal-1',
        organizationId: 'org-1',
        title: 'Active Proposal Title',
        status: 'Open' as const,
        createdByUserId: 'user-456',
        createdAt: '2024-01-01T00:00:00Z',
        endAt: '2099-12-31T00:00:00Z',
      },
    ];
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue(mockProposals);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Active Proposal Title')).toBeInTheDocument();
    });

    expect(screen.getByText(/you have/i)).toBeInTheDocument();
    expect(screen.getByText(/proposal.*open for voting/i)).toBeInTheDocument();
  });

  it('displays empty state when no active proposals', async () => {
    setupAuthenticatedUser();
    const mockMemberships = [
      {
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Test Organization',
        userId: 'user-123',
        role: 'Member' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('no-active-proposals')).toBeInTheDocument();
    });

    expect(screen.getByText(/no active proposals right now/i)).toBeInTheDocument();
  });

  it('displays error message when API fails', async () => {
    setupAuthenticatedUser();
    vi.mocked(membershipsApi.getByUserId).mockRejectedValue(new Error('Network error'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows user account info in account card', async () => {
    const user = setupAuthenticatedUser();
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('account-card')).toBeInTheDocument();
    });

    expect(screen.getByText(user.email)).toBeInTheDocument();
    expect(screen.getByText(user.displayName)).toBeInTheDocument();
  });

  it('renders "View All Organizations" link', async () => {
    setupAuthenticatedUser();
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view all organizations/i })).toBeInTheDocument();
    });
  });

  it('renders "Manage Account" link', async () => {
    setupAuthenticatedUser();
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue([]);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /manage account/i })).toBeInTheDocument();
    });
  });
});
