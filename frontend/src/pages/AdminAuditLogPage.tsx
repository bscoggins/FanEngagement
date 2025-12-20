import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { auditEventsApi } from '../api/auditEventsApi';
import { organizationsApi } from '../api/organizationsApi';
import { parseApiError } from '../utils/errorUtils';
import { ACTION_TYPES, RESOURCE_TYPES, getOutcomeBadgeClass, getActionBadgeClass, formatDate } from '../utils/auditUtils';
import { Pagination } from '../components/Pagination';
import './AdminPage.css';
import type { AuditEvent, Organization, PagedResult } from '../types/api';
import { SkeletonTable, SkeletonTextLines } from '../components/Skeleton';

export const AdminAuditLogPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [auditEvents, setAuditEvents] = useState<PagedResult<AuditEvent> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!orgId) {
      setError('Invalid organization ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const filters = {
        page,
        pageSize,
        dateFrom: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
        actionType: selectedActionTypes.length > 0 ? selectedActionTypes.join(',') : undefined,
        resourceType: selectedResourceTypes.length > 0 ? selectedResourceTypes.join(',') : undefined,
      };

      const [orgData, eventsData] = await Promise.all([
        organizationsApi.getById(orgId),
        auditEventsApi.getByOrganization(orgId, filters),
      ]);

      setOrganization(orgData);
      setAuditEvents(eventsData);
    } catch (err) {
      console.error('Failed to fetch audit data:', err);
      setError(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [orgId, page, pageSize, dateFrom, dateTo, selectedActionTypes, selectedResourceTypes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActionTypeChange = (actionType: string) => {
    setSelectedActionTypes((prev) =>
      prev.includes(actionType) ? prev.filter((t) => t !== actionType) : [...prev, actionType]
    );
    setPage(1);
  };

  const handleResourceTypeChange = (resourceType: string) => {
    setSelectedResourceTypes((prev) =>
      prev.includes(resourceType) ? prev.filter((t) => t !== resourceType) : [...prev, resourceType]
    );
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const toggleRowExpansion = (eventId: string) => {
    setExpandedRowId((prev) => (prev === eventId ? null : eventId));
  };

  if (isLoading && !organization) {
    return (
      <div className="admin-page" role="status" aria-live="polite">
        <div className="admin-card compact" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <h1>Audit Log</h1>
          <SkeletonTextLines count={2} widths={['60%', '45%']} />
          <SkeletonTable columns={5} rows={6} />
          <p className="admin-secondary-text">Loading audit log...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="admin-page">
        <div className="admin-alert admin-alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
          {error || 'Organization not found'}
        </div>
        <button onClick={fetchData} className="admin-button admin-button-outline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1 data-testid="audit-log-heading">Audit Log</h1>
          <div className="admin-page-subtitle">Organization: {organization.name}</div>
        </div>
      </div>

      {error && (
        <div
          className="admin-alert admin-alert-error"
          style={{
            marginBottom: 'var(--spacing-4)',
            display: 'flex',
            gap: 'var(--spacing-4)',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button onClick={fetchData} className="admin-button admin-button-outline">
            Retry
          </button>
        </div>
      )}

      <div className="admin-card" style={{ marginBottom: 'var(--spacing-5)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-2)' }}>Filters</h3>
          <p className="admin-secondary-text" style={{ margin: 0 }}>
            Narrow the audit log with date ranges, action types, and resources.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-4)' }}>
          <div>
            <label htmlFor="dateFrom" className="admin-form-label">
              From Date
            </label>
            <input
              id="dateFrom"
              type="date"
              data-testid="audit-log-filter-date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="admin-input"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="admin-form-label">
              To Date
            </label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="admin-input"
            />
          </div>
        </div>

        <div>
          <label className="admin-form-label" style={{ marginBottom: 'var(--spacing-2)' }}>
            Action Types
          </label>
          <div className="admin-filter-group" data-testid="audit-log-filter-action">
            {ACTION_TYPES.map((actionType) => (
              <label
                key={actionType}
                className={`admin-filter-chip ${selectedActionTypes.includes(actionType) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedActionTypes.includes(actionType)}
                  onChange={() => handleActionTypeChange(actionType)}
                />
                {actionType}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="admin-form-label" style={{ marginBottom: 'var(--spacing-2)' }}>
            Resource Types
          </label>
          <div className="admin-filter-group" data-testid="audit-log-filter-resource">
            {RESOURCE_TYPES.map((resourceType) => (
              <label
                key={resourceType}
                className={`admin-filter-chip ${selectedResourceTypes.includes(resourceType) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedResourceTypes.includes(resourceType)}
                  onChange={() => handleResourceTypeChange(resourceType)}
                />
                {resourceType}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-table-meta" data-testid="audit-log-pagination">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <label htmlFor="pageSize" className="admin-form-label" style={{ marginBottom: 0 }}>
            Items per page
          </label>
          <select id="pageSize" value={pageSize} onChange={handlePageSizeChange} className="admin-select" style={{ minWidth: '5rem' }}>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <div className="admin-meta-text">
          {auditEvents ? `${auditEvents.totalCount} total events` : '0 events'}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }} role="status" aria-live="polite">
          <SkeletonTextLines count={2} widths={['55%', '35%']} />
          <SkeletonTable columns={6} rows={7} />
          <p className="admin-secondary-text">Loading audit events...</p>
        </div>
      ) : !auditEvents || auditEvents.items.length === 0 ? (
        <div className="admin-empty-state">
          {dateFrom || dateTo || selectedActionTypes.length > 0 || selectedResourceTypes.length > 0
            ? 'No audit events found matching your filters.'
            : 'No audit events found for this organization.'}
        </div>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table data-testid="audit-log-table" className="admin-table">
              <thead>
                <tr>
                  <th className="admin-table-toggle-column"></th>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.items.map((event) => (
                  <React.Fragment key={event.id}>
                    <tr className="admin-table-row" onClick={() => toggleRowExpansion(event.id)}>
                      <td>
                        <button
                          type="button"
                          className="admin-table-toggle"
                          aria-label={expandedRowId === event.id ? 'Collapse details' : 'Expand details'}
                        >
                          {expandedRowId === event.id ? '▼' : '▶'}
                        </button>
                      </td>
                      <td>
                        <div className="admin-meta-text">{formatDate(event.timestamp)}</div>
                      </td>
                      <td>
                        <div className="admin-meta-text admin-meta-text-primary">{event.actorDisplayName || 'System'}</div>
                        {event.actorUserId && <div className="admin-secondary-text">{event.actorUserId}</div>}
                      </td>
                      <td>
                        <span className={getActionBadgeClass(event.actionType)}>{event.actionType}</span>
                      </td>
                      <td>
                        <div className="admin-meta-text admin-meta-text-primary admin-meta-text-strong">{event.resourceType}</div>
                        {event.resourceName && <div className="admin-secondary-text">{event.resourceName}</div>}
                      </td>
                      <td>
                        <span className={getOutcomeBadgeClass(event.outcome)}>{event.outcome}</span>
                      </td>
                    </tr>
                    {expandedRowId === event.id && (
                      <tr className="admin-table-expanded-row">
                        <td colSpan={6}>
                          <div className="admin-info-grid">
                            <div>
                              <span className="admin-detail-label">Correlation ID</span>
                              <div className="admin-mono">{event.correlationId || '-'}</div>
                            </div>
                            <div>
                              <span className="admin-detail-label">IP Address</span>
                              <div className="admin-mono">{event.actorIpAddress || '-'}</div>
                            </div>
                            <div>
                              <span className="admin-detail-label">Resource ID</span>
                              <div className="admin-mono">{event.resourceId}</div>
                            </div>
                            <div>
                              <span className="admin-detail-label">Organization</span>
                              <div className="admin-mono">{event.organizationName || '-'}</div>
                            </div>
                          </div>
                          {event.failureReason && (
                            <div className="admin-form-field">
                              <span className="admin-detail-label">Failure Reason</span>
                              <div className="admin-alert admin-alert-error admin-preformatted">{event.failureReason}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {auditEvents.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={auditEvents.totalPages}
              onPageChange={handlePageChange}
              hasPreviousPage={auditEvents.hasPreviousPage}
              hasNextPage={auditEvents.hasNextPage}
            />
          )}
        </>
      )}
    </div>
  );
};
