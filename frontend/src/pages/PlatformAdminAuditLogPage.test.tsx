import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformAdminAuditLogPage } from './PlatformAdminAuditLogPage';
import { auditEventsApi } from '../api/auditEventsApi';
import { organizationsApi } from '../api/organizationsApi';
import type { PagedResult, AuditEvent, Organization } from '../types/api';

// Mock the API modules
vi.mock('../api/auditEventsApi');
vi.mock('../api/organizationsApi');

describe('PlatformAdminAuditLogPage', () => {
  const mockOrganizations: Organization[] = [
    {
      id: 'org-1',
      name: 'Test Organization 1',
      description: 'Test org 1',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'org-2',
      name: 'Test Organization 2',
      description: 'Test org 2',
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  const mockAuditEvents: PagedResult<AuditEvent> = {
    items: [
      {
        id: 'event-1',
        timestamp: '2024-01-15T10:30:00Z',
        actorUserId: 'user-1',
        actorDisplayName: 'John Doe',
        actorIpAddress: '192.168.1.1',
        actionType: 'Created',
        outcome: 'Success',
        resourceType: 'Organization',
        resourceId: 'org-1',
        resourceName: 'Test Organization 1',
        organizationId: 'org-1',
        organizationName: 'Test Organization 1',
        correlationId: 'corr-123',
      },
      {
        id: 'event-2',
        timestamp: '2024-01-15T11:00:00Z',
        actorUserId: 'user-2',
        actorDisplayName: 'Jane Smith',
        actorIpAddress: '192.168.1.2',
        actionType: 'Updated',
        outcome: 'Success',
        resourceType: 'User',
        resourceId: 'user-1',
        resourceName: 'John Doe',
        organizationId: 'org-2',
        organizationName: 'Test Organization 2',
        correlationId: 'corr-456',
      },
    ],
    totalCount: 2,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(organizationsApi.getAll).mockResolvedValue(mockOrganizations);
    vi.mocked(auditEventsApi.getAllAcrossOrganizations).mockResolvedValue(mockAuditEvents);
  });

  it('renders the page heading', async () => {
    render(<PlatformAdminAuditLogPage />);

    const heading = await screen.findByTestId('platform-audit-log-heading');
    expect(heading).toHaveTextContent('Platform Audit Log');
  });

  it('loads and displays audit events', async () => {
    render(<PlatformAdminAuditLogPage />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-log-table')).toBeInTheDocument();
    });

    // Check that organizations and actors appear (may appear multiple times)
    expect(screen.getAllByText('Test Organization 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Test Organization 2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
  });

  it('displays organization filter with all organizations option', async () => {
    render(<PlatformAdminAuditLogPage />);

    await waitFor(() => {
      expect(screen.getByTestId('organization-filter')).toBeInTheDocument();
    });

    const select = screen.getByTestId('organization-filter') as HTMLSelectElement;
    expect(select.options[0].text).toBe('All Organizations');
    expect(select.options[1].text).toBe('Test Organization 1');
    expect(select.options[2].text).toBe('Test Organization 2');
  });

  it('displays export buttons', async () => {
    render(<PlatformAdminAuditLogPage />);

    await waitFor(() => {
      expect(screen.getByTestId('export-csv-button')).toBeInTheDocument();
      expect(screen.getByTestId('export-json-button')).toBeInTheDocument();
    });
  });

  it('displays filter controls', async () => {
    render(<PlatformAdminAuditLogPage />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-log-filter-date-from')).toBeInTheDocument();
      expect(screen.getByTestId('audit-log-filter-date-to')).toBeInTheDocument();
      expect(screen.getByTestId('audit-log-filter-action')).toBeInTheDocument();
      expect(screen.getByTestId('audit-log-filter-resource')).toBeInTheDocument();
    });
  });

  it('displays pagination controls', async () => {
    render(<PlatformAdminAuditLogPage />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-log-pagination')).toBeInTheDocument();
    });

    expect(screen.getByText('2 total events')).toBeInTheDocument();
  });

  it('shows loading spinner initially', async () => {
    render(<PlatformAdminAuditLogPage />);

    await waitFor(() => {
      expect(screen.getByText('Loading audit log...')).toBeInTheDocument();
    });
  });

  it('shows empty state when no events found', async () => {
    vi.mocked(auditEventsApi.getAllAcrossOrganizations).mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });

    render(<PlatformAdminAuditLogPage />);

    await waitFor(() => {
      expect(screen.getByText('No audit events found.')).toBeInTheDocument();
    });
  });

  it('displays organization column in the table', async () => {
    render(<PlatformAdminAuditLogPage />);

    await waitFor(() => {
      const table = screen.getByTestId('audit-log-table');
      expect(table).toBeInTheDocument();
    });

    // Check for organization column header in the table specifically
    const table = screen.getByTestId('audit-log-table');
    const headers = table.querySelectorAll('th');
    const orgHeader = Array.from(headers).find(h => h.textContent === 'Organization');
    expect(orgHeader).toBeDefined();
  });
});
