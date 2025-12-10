import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { AdminDashboardPage } from './AdminDashboardPage';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveOrganization } from '../contexts/OrgContext';
import { membershipsApi } from '../api/membershipsApi';
import { shareTypesApi } from '../api/shareTypesApi';
import { proposalsApi } from '../api/proposalsApi';
import { outboundEventsApi } from '../api/outboundEventsApi';
import { auditEventsApi } from '../api/auditEventsApi';
import type { OutboundEvent } from '../types/api';

vi.mock('../hooks/usePermissions');
vi.mock('../contexts/OrgContext');
vi.mock('../api/membershipsApi', () => ({
  membershipsApi: {
    getByOrganizationWithUserDetails: vi.fn(),
  },
}));
vi.mock('../api/shareTypesApi', () => ({
  shareTypesApi: {
    getByOrganization: vi.fn(),
  },
}));
vi.mock('../api/proposalsApi', () => ({
  proposalsApi: {
    getByOrganization: vi.fn(),
  },
}));
vi.mock('../api/outboundEventsApi', () => ({
  outboundEventsApi: {
    getAll: vi.fn(),
  },
}));
vi.mock('../api/auditEventsApi', () => ({
  auditEventsApi: {
    getByOrganization: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('AdminDashboardPage', () => {
  const mockNavigate = vi.fn();

  const mockActiveOrg = {
    id: 'org-1',
    name: 'Tech Innovators',
    role: 'OrgAdmin' as const,
  };

  const orgAdminMembership = {
    id: 'membership-1',
    organizationId: 'org-1',
    organizationName: 'Tech Innovators',
    userId: 'user-1',
    role: 'OrgAdmin' as const,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const orgMembershipDetails = [
    {
      id: 'membership-1',
      organizationId: 'org-1',
      userId: 'user-1',
      userEmail: 'admin1@example.com',
      userDisplayName: 'Admin One',
      role: 'OrgAdmin' as const,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'membership-2',
      organizationId: 'org-1',
      userId: 'user-2',
      userEmail: 'admin2@example.com',
      userDisplayName: 'Admin Two',
      role: 'OrgAdmin' as const,
      createdAt: '2024-01-05T00:00:00Z',
    },
    {
      id: 'membership-3',
      organizationId: 'org-1',
      userId: 'user-3',
      userEmail: 'member1@example.com',
      userDisplayName: 'Member One',
      role: 'Member' as const,
      createdAt: '2024-01-10T00:00:00Z',
    },
    {
      id: 'membership-4',
      organizationId: 'org-1',
      userId: 'user-4',
      userEmail: 'member2@example.com',
      userDisplayName: 'Member Two',
      role: 'Member' as const,
      createdAt: '2024-01-12T00:00:00Z',
    },
  ];

  const shareTypes = [
    {
      id: 'share-1',
      organizationId: 'org-1',
      name: 'Common',
      symbol: 'COM',
      votingWeight: 1,
      isTransferable: true,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'share-2',
      organizationId: 'org-1',
      name: 'Preferred',
      symbol: 'PRE',
      votingWeight: 3,
      isTransferable: false,
      createdAt: '2024-01-03T00:00:00Z',
    },
  ];

  const proposals = [
    {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Adopt new benefits',
      status: 'Open' as const,
      createdByUserId: 'user-1',
      createdAt: '2024-02-01T00:00:00Z',
    },
    {
      id: 'proposal-2',
      organizationId: 'org-1',
      title: 'Adjust share weightings',
      status: 'Draft' as const,
      createdByUserId: 'user-1',
      createdAt: '2024-02-05T00:00:00Z',
    },
  ];

  const auditEvents = [
    {
      id: 'audit-1',
      timestamp: '2024-02-10T12:00:00Z',
      actorUserId: 'user-1',
      actorDisplayName: 'Admin One',
      actorIpAddress: '127.0.0.1',
      actionType: 'Created' as const,
      outcome: 'Success' as const,
      resourceType: 'Proposal' as const,
      resourceId: 'proposal-1',
      resourceName: 'Adopt new benefits',
      organizationId: 'org-1',
    },
  ];

  const outboundEventsSample: OutboundEvent[] = [
    {
      id: 'evt-1',
      organizationId: 'org-1',
      webhookEndpointId: 'webhook-1',
      eventType: 'ProposalCreated',
      status: 'Failed' as const,
      attemptCount: 1,
      createdAt: '2024-02-09T00:00:00Z',
    },
  ];

  const createPermissionsMock = (
    overrides: Partial<ReturnType<typeof usePermissions>> = {}
  ): ReturnType<typeof usePermissions> => ({
    isGlobalAdmin: () => false,
    isOrgAdmin: () => false,
    isOrgMember: () => false,
    hasAnyOrgAdminRole: () => false,
    canAccessAdminArea: () => false,
    memberships: [],
    isLoading: false,
    refreshMemberships: vi.fn(),
    ...overrides,
  });

  const createOrgContextMock = (
    overrides: Partial<ReturnType<typeof useActiveOrganization>> = {}
  ): ReturnType<typeof useActiveOrganization> => ({
    activeOrg: null,
    setActiveOrg: vi.fn(),
    memberships: [],
    hasMultipleOrgs: false,
    isLoading: false,
    refreshMemberships: vi.fn(),
    ...overrides,
  });

  const renderAdminDashboard = () =>
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

  const setupSuccessfulDashboardMocks = () => {
    vi.mocked(membershipsApi.getByOrganizationWithUserDetails).mockResolvedValue(orgMembershipDetails);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValue(shareTypes);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue(proposals);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValue(outboundEventsSample);
    vi.mocked(auditEventsApi.getByOrganization).mockResolvedValue({
      items: auditEvents,
      totalCount: auditEvents.length,
      page: 1,
      pageSize: 5,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  it('renders stats grid and quick actions with organization data', async () => {
    setupSuccessfulDashboardMocks();

    vi.mocked(usePermissions).mockReturnValue(
      createPermissionsMock({
        memberships: [orgAdminMembership],
      })
    );
    vi.mocked(useActiveOrganization).mockReturnValue(
      createOrgContextMock({
        activeOrg: mockActiveOrg,
        hasMultipleOrgs: true,
      })
    );

    renderAdminDashboard();

    await waitFor(() => expect(screen.getByTestId('members-stat-card')).toHaveTextContent('4'));

    expect(screen.getByTestId('stats-grid')).toBeInTheDocument();
    expect(screen.getByTestId('quick-actions-grid')).toBeInTheDocument();
    expect(screen.getByTestId('recent-activity-card')).toBeInTheDocument();
    expect(screen.getByTestId('manage-members-card')).toBeInTheDocument();
  });

  it('redirects to member dashboard when active org access is member-only', async () => {
    vi.mocked(usePermissions).mockReturnValue(
      createPermissionsMock({
        memberships: [
          {
            ...orgAdminMembership,
            role: 'Member',
          },
        ],
      })
    );
    vi.mocked(useActiveOrganization).mockReturnValue(
      createOrgContextMock({
        activeOrg: { ...mockActiveOrg, role: 'Member' },
      })
    );

    const { container } = renderAdminDashboard();

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/me/organizations/org-1', { replace: true })
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows empty state when user doesn't administer any organizations", () => {
    vi.mocked(usePermissions).mockReturnValue(
      createPermissionsMock({
        memberships: [],
        isLoading: false,
      })
    );
    vi.mocked(useActiveOrganization).mockReturnValue(createOrgContextMock());

    renderAdminDashboard();

    expect(
      screen.getByText(/You don't have administrator permissions for any organizations/i)
    ).toBeInTheDocument();
    expect(membershipsApi.getByOrganizationWithUserDetails).not.toHaveBeenCalled();
  });

  it('shows error and retries when dashboard data fails to load', async () => {
    const user = userEvent.setup();
    vi.mocked(membershipsApi.getByOrganizationWithUserDetails)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(orgMembershipDetails);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValue(shareTypes);
    vi.mocked(proposalsApi.getByOrganization).mockResolvedValue(proposals);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValue([]);
    vi.mocked(auditEventsApi.getByOrganization).mockResolvedValue({
      items: auditEvents,
      totalCount: 1,
      page: 1,
      pageSize: 5,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

    vi.mocked(usePermissions).mockReturnValue(
      createPermissionsMock({
        memberships: [orgAdminMembership],
      })
    );
    vi.mocked(useActiveOrganization).mockReturnValue(
      createOrgContextMock({
        activeOrg: mockActiveOrg,
      })
    );

    renderAdminDashboard();

    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByTestId('members-stat-card')).toHaveTextContent('4'));
    expect(membershipsApi.getByOrganizationWithUserDetails).toHaveBeenCalledTimes(2);
  });

  it('shows platform admin shortcut for global admins', () => {
    vi.mocked(usePermissions).mockReturnValue(
      createPermissionsMock({
        isGlobalAdmin: () => true,
        memberships: [],
      })
    );
    vi.mocked(useActiveOrganization).mockReturnValue(createOrgContextMock());

    renderAdminDashboard();

    expect(screen.getByText('Platform Admin Dashboard')).toBeInTheDocument();
  });
});
