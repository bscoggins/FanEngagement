import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminAuditLogPage } from './AdminAuditLogPage';
import { AuthProvider } from '../auth/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import * as auditEventsApi from '../api/auditEventsApi';
import * as organizationsApi from '../api/organizationsApi';
import type { PagedResult, AuditEvent, Organization } from '../types/api';

// Mock the API modules
vi.mock('../api/auditEventsApi');
vi.mock('../api/organizationsApi');

const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Test Organization',
  description: 'Test description',
  createdAt: '2024-01-01T00:00:00Z',
};

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
      resourceType: 'User',
      resourceId: 'resource-1',
      resourceName: 'Test User',
      organizationId: 'org-1',
      organizationName: 'Test Organization',
      correlationId: 'corr-123',
    },
    {
      id: 'event-2',
      timestamp: '2024-01-15T11:00:00Z',
      actorUserId: 'user-2',
      actorDisplayName: 'Jane Smith',
      actionType: 'Updated',
      outcome: 'Success',
      resourceType: 'Organization',
      resourceId: 'resource-2',
      resourceName: 'Test Org',
      organizationId: 'org-1',
      organizationName: 'Test Organization',
    },
    {
      id: 'event-3',
      timestamp: '2024-01-15T12:00:00Z',
      actorUserId: 'user-3',
      actorDisplayName: 'Bob Johnson',
      actionType: 'Deleted',
      outcome: 'Failure',
      failureReason: 'Permission denied',
      resourceType: 'Proposal',
      resourceId: 'resource-3',
      resourceName: 'Test Proposal',
      organizationId: 'org-1',
      organizationName: 'Test Organization',
    },
  ],
  totalCount: 3,
  page: 1,
  pageSize: 50,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

const renderWithRouter = (orgId: string = 'org-1') => {
  return render(
    <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/audit-log`]}>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            <Route path="/admin/organizations/:orgId/audit-log" element={<AdminAuditLogPage />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </MemoryRouter>
  );
};

describe('AdminAuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders audit log page with heading', async () => {
    vi.mocked(organizationsApi.organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(auditEventsApi.auditEventsApi.getByOrganization).mockResolvedValue(mockAuditEvents);

    renderWithRouter();

    expect(screen.getByTestId('audit-log-heading')).toBeInTheDocument();
    expect(screen.getByTestId('audit-log-heading')).toHaveTextContent('Audit Log');
  });

  it('displays loading state initially', async () => {
    vi.mocked(organizationsApi.organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(auditEventsApi.auditEventsApi.getByOrganization).mockResolvedValue(mockAuditEvents);

    renderWithRouter();

    expect(screen.getByText(/Loading audit log\.\.\./i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading audit log\.\.\./i)).not.toBeInTheDocument();
    });
  });

  it('displays organization name', async () => {
    vi.mocked(organizationsApi.organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(auditEventsApi.auditEventsApi.getByOrganization).mockResolvedValue(mockAuditEvents);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Organization: Test Organization/i)).toBeInTheDocument();
    });
  });

  it('displays audit events in table', async () => {
    vi.mocked(organizationsApi.organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(auditEventsApi.auditEventsApi.getByOrganization).mockResolvedValue(mockAuditEvents);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId('audit-log-table')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('displays filter controls', async () => {
    vi.mocked(organizationsApi.organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(auditEventsApi.auditEventsApi.getByOrganization).mockResolvedValue(mockAuditEvents);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId('audit-log-filter-date')).toBeInTheDocument();
    });

    expect(screen.getByTestId('audit-log-filter-action')).toBeInTheDocument();
    expect(screen.getByTestId('audit-log-filter-resource')).toBeInTheDocument();
  });

  it('displays pagination controls', async () => {
    vi.mocked(organizationsApi.organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(auditEventsApi.auditEventsApi.getByOrganization).mockResolvedValue(mockAuditEvents);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId('audit-log-pagination')).toBeInTheDocument();
    });

    expect(screen.getByText('Items per page:')).toBeInTheDocument();
    expect(screen.getByText('3 total events')).toBeInTheDocument();
  });

  it('displays error message when API fails', async () => {
    vi.mocked(organizationsApi.organizationsApi.getById).mockRejectedValue(new Error('Network error'));
    vi.mocked(auditEventsApi.auditEventsApi.getByOrganization).mockRejectedValue(new Error('Network error'));

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no events found', async () => {
    vi.mocked(organizationsApi.organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(auditEventsApi.auditEventsApi.getByOrganization).mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/No audit events found for this organization/i)).toBeInTheDocument();
    });
  });

  it('displays outcome badges with correct styles', async () => {
    vi.mocked(organizationsApi.organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(auditEventsApi.auditEventsApi.getByOrganization).mockResolvedValue(mockAuditEvents);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getAllByText('Success')).toHaveLength(2);
    });

    expect(screen.getByText('Failure')).toBeInTheDocument();
  });

  it('displays action type badges', async () => {
    vi.mocked(organizationsApi.organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(auditEventsApi.auditEventsApi.getByOrganization).mockResolvedValue(mockAuditEvents);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId('audit-log-table')).toBeInTheDocument();
    });

    // Check that action types appear in the table
    const table = screen.getByTestId('audit-log-table');
    expect(table).toHaveTextContent('Created');
    expect(table).toHaveTextContent('Updated');
    expect(table).toHaveTextContent('Deleted');
  });
});
