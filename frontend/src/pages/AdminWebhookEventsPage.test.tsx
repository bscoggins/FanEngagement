import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminWebhookEventsPage } from './AdminWebhookEventsPage';
import { outboundEventsApi } from '../api/outboundEventsApi';
import { organizationsApi } from '../api/organizationsApi';
import { NotificationProvider } from '../contexts/NotificationContext';
import type { OutboundEvent, OutboundEventDetails, Organization } from '../types/api';

// Mock the APIs
vi.mock('../api/outboundEventsApi', () => ({
  outboundEventsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    retry: vi.fn(),
  },
}));

vi.mock('../api/organizationsApi', () => ({
  organizationsApi: {
    getById: vi.fn(),
  },
}));

describe('AdminWebhookEventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrganization: Organization = {
    id: 'org-1',
    name: 'Test Organization',
    description: 'Test description',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockEvents: OutboundEvent[] = [
    {
      id: 'event-1',
      organizationId: 'org-1',
      eventType: 'ProposalCreated',
      status: 'Delivered',
      attemptCount: 1,
      lastAttemptAt: '2024-01-01T12:00:00Z',
      createdAt: '2024-01-01T11:00:00Z',
    },
    {
      id: 'event-2',
      organizationId: 'org-1',
      eventType: 'ProposalClosed',
      status: 'Failed',
      attemptCount: 3,
      lastAttemptAt: '2024-01-02T14:00:00Z',
      lastError: 'HTTP 500 Internal Server Error from https://example.com/webhook',
      createdAt: '2024-01-02T12:00:00Z',
    },
    {
      id: 'event-3',
      organizationId: 'org-1',
      eventType: 'VoteCast',
      status: 'Pending',
      attemptCount: 0,
      createdAt: '2024-01-03T10:00:00Z',
    },
  ];

  const mockEventDetails: OutboundEventDetails = {
    id: 'event-2',
    organizationId: 'org-1',
    eventType: 'ProposalClosed',
    payload: '{"proposalId": "123", "title": "Test Proposal"}',
    status: 'Failed',
    attemptCount: 3,
    lastAttemptAt: '2024-01-02T14:00:00Z',
    lastError: 'HTTP 500 Internal Server Error from https://example.com/webhook',
    createdAt: '2024-01-02T12:00:00Z',
  };

  const renderPage = (orgId = 'org-1') => {
    return render(
      <NotificationProvider>
        <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/webhook-events`]}>
          <Routes>
            <Route path="/admin/organizations/:orgId/webhook-events" element={<AdminWebhookEventsPage />} />
          </Routes>
        </MemoryRouter>
      </NotificationProvider>
    );
  };

  it('renders webhook events heading', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValueOnce(mockEvents);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Webhook Events')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    vi.mocked(organizationsApi.getById).mockImplementation(() => new Promise(() => {}));
    vi.mocked(outboundEventsApi.getAll).mockImplementation(() => new Promise(() => {}));
    
    renderPage();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('loads and displays events', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValueOnce(mockEvents);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check for event types in the table (using getAllByText since they appear in dropdown too)
    expect(screen.getAllByText('ProposalCreated').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ProposalClosed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('VoteCast').length).toBeGreaterThanOrEqual(1);
    // Check for statuses - these appear in both dropdown and table
    expect(screen.getAllByText('Delivered').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Failed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
  });

  it('displays retry button only for failed events', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValueOnce(mockEvents);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Should have exactly one Retry button (for the Failed event)
    const retryButtons = screen.getAllByText('Retry');
    expect(retryButtons).toHaveLength(1);
  });

  it('filters events by status', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValue(mockEvents);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Change status filter
    const statusFilter = screen.getByLabelText('Status');
    fireEvent.change(statusFilter, { target: { value: 'Failed' } });
    
    await waitFor(() => {
      expect(outboundEventsApi.getAll).toHaveBeenLastCalledWith('org-1', { status: 'Failed' });
    });
  });

  it('filters events by event type', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValue(mockEvents);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Change event type filter
    const eventTypeFilter = screen.getByLabelText('Event Type');
    fireEvent.change(eventTypeFilter, { target: { value: 'ProposalCreated' } });
    
    await waitFor(() => {
      expect(outboundEventsApi.getAll).toHaveBeenLastCalledWith('org-1', { eventType: 'ProposalCreated' });
    });
  });

  it('opens detail modal when View is clicked', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValueOnce(mockEvents);
    vi.mocked(outboundEventsApi.getById).mockResolvedValueOnce(mockEventDetails);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Click the first View button
    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[1]); // Click on the failed event
    
    await waitFor(() => {
      expect(screen.getByText('Event Details')).toBeInTheDocument();
    });
    
    // Verify details are shown
    expect(await screen.findByText(/proposalId/)).toBeInTheDocument();
  });

  it('retries a failed event when Retry is clicked', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValue(mockEvents);
    vi.mocked(outboundEventsApi.retry).mockResolvedValueOnce(undefined);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Click the Retry button
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(outboundEventsApi.retry).toHaveBeenCalledWith('org-1', 'event-2');
    });
    
    // Verify the API was called and data is refreshed
    await waitFor(() => {
      // After retry, getAll should have been called again to refresh the list
      expect(outboundEventsApi.getAll).toHaveBeenCalledTimes(2);
    });
  });

  it('displays empty state when no events exist', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValueOnce([]);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No webhook events found for this organization.')).toBeInTheDocument();
  });

  it('displays empty state with filter message when no events match filters', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(outboundEventsApi.getAll)
      .mockResolvedValueOnce(mockEvents) // Initial load
      .mockResolvedValueOnce([]); // After filter
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Change status filter to something that returns no results
    const statusFilter = screen.getByLabelText('Status');
    fireEvent.change(statusFilter, { target: { value: 'Failed' } });
    
    await waitFor(() => {
      expect(screen.getByText('No events found matching your filters.')).toBeInTheDocument();
    });
  });

  it('shows last error in the table for failed events', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValueOnce(mockEvents);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // The error should be truncated in the table
    expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
  });

  it('displays organization name', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValueOnce(mockEvents);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText(/Test Organization/)).toBeInTheDocument();
    });
  });

  it('displays event count', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(outboundEventsApi.getAll).mockResolvedValueOnce(mockEvents);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('3 events')).toBeInTheDocument();
  });

  it('shows blockchain adapter panel when organization has blockchain type', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce({
      ...mockOrganization,
      blockchainType: 'Polygon',
      blockchainConfig: '{"network":"amoy","adapterUrl":"https://adapter","apiKey":"key"}',
    });
    vi.mocked(outboundEventsApi.getAll).mockResolvedValueOnce(mockEvents);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Blockchain Adapter')).toBeInTheDocument();
    });

    expect(screen.getByText('Polygon')).toBeInTheDocument();
    expect(screen.getByText(/Network: amoy/)).toBeInTheDocument();
    expect(screen.getByText('View Adapter Metrics')).toBeInTheDocument();
  });

  it('hides blockchain adapter panel when blockchain type is None', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce({
      ...mockOrganization,
      blockchainType: 'None',
    });
    vi.mocked(outboundEventsApi.getAll).mockResolvedValueOnce(mockEvents);

    renderPage();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    expect(screen.queryByText('Blockchain Adapter')).not.toBeInTheDocument();
  });
});
