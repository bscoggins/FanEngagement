import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyActivityPage } from './MyActivityPage';
import * as auditEventsApiModule from '../api/auditEventsApi';
import type { PagedResult, AuditEvent } from '../types/api';

vi.mock('../api/auditEventsApi');

const mockGetMyActivity = vi.fn();

vi.mocked(auditEventsApiModule).auditEventsApi = {
  getByOrganization: vi.fn(),
  getAllAcrossOrganizations: vi.fn(),
  exportAllAcrossOrganizations: vi.fn(),
  getMyActivity: mockGetMyActivity,
};

describe('MyActivityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockEvent = (override?: Partial<AuditEvent>): AuditEvent => ({
    id: '1',
    timestamp: new Date().toISOString(),
    actorUserId: 'user1',
    actorDisplayName: 'Test User',
    actionType: 'Created',
    outcome: 'Success',
    resourceType: 'Vote',
    resourceId: 'vote1',
    resourceName: 'Test Proposal',
    organizationId: 'org1',
    organizationName: 'Test Org',
    ...override,
  });

  const createMockPagedResult = (items: AuditEvent[]): PagedResult<AuditEvent> => ({
    items,
    totalCount: items.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  it('renders loading state initially', () => {
    mockGetMyActivity.mockReturnValue(new Promise(() => {}));
    render(<MyActivityPage />);
    expect(screen.getByText('Loading your activity...')).toBeInTheDocument();
  });

  it('displays activities after loading', async () => {
    const mockEvent = createMockEvent();
    mockGetMyActivity.mockResolvedValue(createMockPagedResult([mockEvent]));

    render(<MyActivityPage />);

    await waitFor(() => {
      expect(screen.getByTestId('activity-list')).toBeInTheDocument();
    });

    expect(screen.getByText(/Voted on proposal/)).toBeInTheDocument();
  });

  it('displays empty state when no activities', async () => {
    mockGetMyActivity.mockResolvedValue(createMockPagedResult([]));

    render(<MyActivityPage />);

    await waitFor(() => {
      expect(screen.getByText(/No activities found/)).toBeInTheDocument();
    });
  });

  it('displays error message on API failure', async () => {
    mockGetMyActivity.mockRejectedValue(new Error('API Error'));

    render(<MyActivityPage />);

    await waitFor(() => {
      expect(screen.getByText(/API Error/)).toBeInTheDocument();
    });
  });

  it('changes date filter when button is clicked', async () => {
    const user = userEvent.setup();
    mockGetMyActivity.mockResolvedValue(createMockPagedResult([]));

    render(<MyActivityPage />);

    await waitFor(() => {
      expect(screen.getByTestId('activity-date-filters')).toBeInTheDocument();
    });

    const allTimeButton = screen.getByTestId('filter-all');
    await user.click(allTimeButton);

    expect(mockGetMyActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: undefined,
      })
    );
  });

  it('displays vote activity correctly', async () => {
    const voteEvent = createMockEvent({
      actionType: 'Created',
      resourceType: 'Vote',
      resourceName: 'Budget Proposal',
      organizationName: 'Dev Team',
    });
    mockGetMyActivity.mockResolvedValue(createMockPagedResult([voteEvent]));

    render(<MyActivityPage />);

    await waitFor(() => {
      expect(screen.getByText(/Voted on proposal "Budget Proposal" in Dev Team/)).toBeInTheDocument();
    });
  });

  it('displays membership joined activity correctly', async () => {
    const membershipEvent = createMockEvent({
      actionType: 'Created',
      resourceType: 'Membership',
      organizationName: 'New Org',
    });
    mockGetMyActivity.mockResolvedValue(createMockPagedResult([membershipEvent]));

    render(<MyActivityPage />);

    await waitFor(() => {
      expect(screen.getByText(/Joined organization "New Org"/)).toBeInTheDocument();
    });
  });

  it('displays profile update activity correctly', async () => {
    const profileEvent = createMockEvent({
      actionType: 'Updated',
      resourceType: 'User',
    });
    mockGetMyActivity.mockResolvedValue(createMockPagedResult([profileEvent]));

    render(<MyActivityPage />);

    await waitFor(() => {
      expect(screen.getByText('Updated profile information')).toBeInTheDocument();
    });
  });

  it('shows pagination when there are multiple pages', async () => {
    const mockEvents = [createMockEvent()];
    const pagedResult: PagedResult<AuditEvent> = {
      items: mockEvents,
      totalCount: 50,
      page: 1,
      pageSize: 20,
      totalPages: 3,
      hasPreviousPage: false,
      hasNextPage: true,
    };
    mockGetMyActivity.mockResolvedValue(pagedResult);

    render(<MyActivityPage />);

    await waitFor(() => {
      expect(screen.getByTestId('activity-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Showing 1 of 50 activities')).toBeInTheDocument();
  });

  it('displays failed outcome badge', async () => {
    const failedEvent = createMockEvent({
      outcome: 'Failure',
    });
    mockGetMyActivity.mockResolvedValue(createMockPagedResult([failedEvent]));

    render(<MyActivityPage />);

    await waitFor(() => {
      expect(screen.getByTestId('activity-outcome')).toBeInTheDocument();
    });

    expect(screen.getByTestId('activity-outcome')).toHaveTextContent('Failure');
  });
});
