import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { OrgProvider } from '../contexts/OrgContext';
import { MemberDashboardPage } from '../pages/MemberDashboardPage';
import { membershipsApi } from '../api/membershipsApi';
import { proposalsApi } from '../api/proposalsApi';
import type { MembershipWithOrganizationDto } from '../types/api';

// Mock the APIs
vi.mock('../api/membershipsApi', () => ({
  membershipsApi: {
    getByUserId: vi.fn(),
    getMyOrganizations: vi.fn(),
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
    // Mock getMyOrganizations to return empty array by default
    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue([]);
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
            <OrgProvider isAuthenticated={true}>
              <Routes>
                <Route path="/me/home" element={<MemberDashboardPage />} />
                <Route path="/me/organizations/:orgId" element={<div>Org Detail Page</div>} />
                <Route path="/me/proposals/:proposalId" element={<div>Proposal Page</div>} />
              </Routes>
            </OrgProvider>
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

  it('renders "Explore Organization" button with org having most proposals', async () => {
    setupAuthenticatedUser();
    const mockMemberships = [
      {
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Org One',
        userId: 'user-123',
        role: 'Member' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'membership-2',
        organizationId: 'org-2',
        organizationName: 'Org Two',
        userId: 'user-123',
        role: 'Member' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];
    
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
    
    // Org-2 has more proposals, so it should be the target
    vi.mocked(proposalsApi.getByOrganization).mockImplementation(async (orgId) => {
      if (orgId === 'org-2') {
        return [
          {
            id: 'proposal-1',
            organizationId: 'org-2',
            title: 'Proposal 1',
            status: 'Open' as const,
            createdByUserId: 'user-456',
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'proposal-2',
            organizationId: 'org-2',
            title: 'Proposal 2',
            status: 'Open' as const,
            createdByUserId: 'user-456',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ];
      }
      return [];
    });

    renderDashboard();

    await waitFor(() => {
      const exploreButton = screen.getByTestId('explore-org-button');
      expect(exploreButton).toHaveTextContent('Explore Org Two');
      expect(exploreButton).toHaveAttribute('href', '/me/organizations/org-2');
    });
  });

  it('handles partial failure when fetching proposals from one organization', async () => {
    setupAuthenticatedUser();
    const mockMemberships = [
      {
        id: 'membership-1',
        organizationId: 'org-1',
        organizationName: 'Org One',
        userId: 'user-123',
        role: 'Member' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'membership-2',
        organizationId: 'org-2',
        organizationName: 'Org Two',
        userId: 'user-123',
        role: 'Member' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];
    
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mockMemberships);
    
    // Org 1 fails, Org 2 succeeds
    vi.mocked(proposalsApi.getByOrganization).mockImplementation(async (orgId) => {
      if (orgId === 'org-1') {
        throw new Error('Network error for org-1');
      }
      return [
        {
          id: 'proposal-1',
          organizationId: 'org-2',
          title: 'Proposal from Org Two',
          status: 'Open' as const,
          createdByUserId: 'user-456',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
    });

    renderDashboard();

    // Should still render successfully with proposals from org-2
    await waitFor(() => {
      expect(screen.getByText('Proposal from Org Two')).toBeInTheDocument();
    });
    
    // Should show both organizations in the organizations card
    const orgLinks = screen.getAllByRole('link', { name: /Org One|Org Two/ });
    expect(orgLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('filters to show only Member orgs when active org is a Member org', async () => {
    setupAuthenticatedUser();
    const mixedMemberships: MembershipWithOrganizationDto[] = [
      {
        id: 'membership-1',
        organizationId: 'org-admin',
        organizationName: 'Admin Org',
        userId: 'user-123',
        role: 'OrgAdmin',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'membership-2',
        organizationId: 'org-member',
        organizationName: 'Member Org',
        userId: 'user-123',
        role: 'Member',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];
    
    // Set active org to a Member org in localStorage
    localStorage.setItem('activeOrganization', JSON.stringify({
      id: 'org-member',
      name: 'Member Org',
      role: 'Member',
    }));
    
    // Mock memberships to return mixed roles
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mixedMemberships);
    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mixedMemberships);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('organizations-card')).toBeInTheDocument();
    });

    // Should only show Member Org, not Admin Org
    expect(screen.getByText('Member Org')).toBeInTheDocument();
    expect(screen.queryByText('Admin Org')).not.toBeInTheDocument();
    
    // Count should be 1 (only member org)
    expect(screen.getByText(/you are a member of/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows all orgs when active org is an OrgAdmin org', async () => {
    setupAuthenticatedUser();
    const mixedMemberships: MembershipWithOrganizationDto[] = [
      {
        id: 'membership-1',
        organizationId: 'org-admin',
        organizationName: 'Admin Org',
        userId: 'user-123',
        role: 'OrgAdmin',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'membership-2',
        organizationId: 'org-member',
        organizationName: 'Member Org',
        userId: 'user-123',
        role: 'Member',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];
    
    // Set active org to an OrgAdmin org in localStorage
    localStorage.setItem('activeOrganization', JSON.stringify({
      id: 'org-admin',
      name: 'Admin Org',
      role: 'OrgAdmin',
    }));
    
    // Mock memberships to return mixed roles
    vi.mocked(membershipsApi.getByUserId).mockResolvedValue(mixedMemberships);
    vi.mocked(membershipsApi.getMyOrganizations).mockResolvedValue(mixedMemberships);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('organizations-card')).toBeInTheDocument();
    });

    // Should show both orgs
    expect(screen.getByText('Admin Org')).toBeInTheDocument();
    expect(screen.getByText('Member Org')).toBeInTheDocument();
    
    // Count should be 2 (all orgs)
    expect(screen.getByText(/you are a member of/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
