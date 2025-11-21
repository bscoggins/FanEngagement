import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { MyOrganizationPage } from './MyOrganizationPage';
import { organizationsApi } from '../api/organizationsApi';
import { shareBalancesApi } from '../api/shareBalancesApi';
import { proposalsApi } from '../api/proposalsApi';

vi.mock('../api/organizationsApi');
vi.mock('../api/shareBalancesApi');
vi.mock('../api/proposalsApi');

const renderWithAuth = (orgId: string, userId: string) => {
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
    <MemoryRouter initialEntries={[`/me/organizations/${orgId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/me/organizations/:orgId" element={<MyOrganizationPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('MyOrganizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('displays organization information and user balances', async () => {
    const mockOrg = {
      id: 'org-1',
      name: 'Test Organization',
      description: 'A test organization',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const mockBalances = [
      {
        shareTypeId: 'share-1',
        shareTypeName: 'Common Shares',
        shareTypeSymbol: 'CS',
        balance: 100,
        updatedAt: '2024-01-15T10:00:00Z',
      },
      {
        shareTypeId: 'share-2',
        shareTypeName: 'Preferred Shares',
        shareTypeSymbol: 'PS',
        balance: 50,
        updatedAt: '2024-01-15T10:00:00Z',
      },
    ];

    const mockProposals = [
      {
        id: 'proposal-1',
        organizationId: 'org-1',
        title: 'Test Proposal',
        description: 'A test proposal',
        status: 'Open' as const,
        startAt: '2024-01-15T00:00:00Z',
        endAt: '2024-02-15T00:00:00Z',
        quorumRequirement: 50,
        createdByUserId: 'user-2',
        createdAt: '2024-01-10T00:00:00Z',
      },
    ];

    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrg);
    vi.mocked(shareBalancesApi.getBalances).mockResolvedValue(mockBalances);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue(mockProposals);

    renderWithAuth('org-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
    });

    expect(screen.getByText('A test organization')).toBeInTheDocument();
    expect(screen.getByText('Your Share Balances')).toBeInTheDocument();
    expect(screen.getByText('Common Shares')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Preferred Shares')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Active Proposals')).toBeInTheDocument();
    expect(screen.getByText('Test Proposal')).toBeInTheDocument();
  });

  it('displays message when user has no share balances', async () => {
    const mockOrg = {
      id: 'org-1',
      name: 'Test Organization',
      description: '',
      createdAt: '2024-01-01T00:00:00Z',
    };

    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrg);
    vi.mocked(shareBalancesApi.getBalances).mockResolvedValue([]);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderWithAuth('org-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
    });

    expect(
      screen.getByText("You don't have any shares in this organization yet.")
    ).toBeInTheDocument();
  });

  it('displays message when there are no active proposals', async () => {
    const mockOrg = {
      id: 'org-1',
      name: 'Test Organization',
      description: '',
      createdAt: '2024-01-01T00:00:00Z',
    };

    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrg);
    vi.mocked(shareBalancesApi.getBalances).mockResolvedValue([]);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderWithAuth('org-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
    });

    expect(
      screen.getByText('There are no active proposals at the moment.')
    ).toBeInTheDocument();
  });

  it('filters to show only Open proposals', async () => {
    const mockOrg = {
      id: 'org-1',
      name: 'Test Organization',
      description: '',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const mockProposals = [
      {
        id: 'proposal-1',
        organizationId: 'org-1',
        title: 'Open Proposal',
        description: '',
        status: 'Open' as const,
        startAt: '2024-01-15T00:00:00Z',
        endAt: '2024-02-15T00:00:00Z',
        quorumRequirement: undefined,
        createdByUserId: 'user-2',
        createdAt: '2024-01-10T00:00:00Z',
      },
      {
        id: 'proposal-2',
        organizationId: 'org-1',
        title: 'Closed Proposal',
        description: '',
        status: 'Closed' as const,
        startAt: '2024-01-01T00:00:00Z',
        endAt: '2024-01-15T00:00:00Z',
        quorumRequirement: undefined,
        createdByUserId: 'user-2',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrg);
    vi.mocked(shareBalancesApi.getBalances).mockResolvedValue([]);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue(mockProposals);

    renderWithAuth('org-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
    });

    expect(screen.getByText('Open Proposal')).toBeInTheDocument();
    expect(screen.queryByText('Closed Proposal')).not.toBeInTheDocument();
  });

  it('displays loading state', () => {
    vi.mocked(organizationsApi.getById).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.mocked(shareBalancesApi.getBalances).mockImplementation(
      () => new Promise(() => {})
    );
    vi.mocked(proposalsApi.getByOrganization).mockImplementation(
      () => new Promise(() => {})
    );

    renderWithAuth('org-1', 'user-1');

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message when data fails to load', async () => {
    vi.mocked(organizationsApi.getById).mockRejectedValue(
      new Error('Network error')
    );

    renderWithAuth('org-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Failed to load organization information.')).toBeInTheDocument();
    });
  });
});
