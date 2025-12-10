import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { auditEventsApi } from '../api/auditEventsApi';
import { organizationsApi } from '../api/organizationsApi';
import { parseApiError } from '../utils/errorUtils';
import { ACTION_TYPES, RESOURCE_TYPES, getOutcomeBadgeStyle, getActionBadgeStyle, formatDate } from '../utils/auditUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Pagination } from '../components/Pagination';
import type { AuditEvent, Organization, PagedResult } from '../types/api';

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
      <div className="admin-page">
        <LoadingSpinner message="Loading audit log..." />
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

      <div className="admin-card" style={{ marginBottom: 'var(--spacing-5)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-4)' }}>Filters</h3>

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

        <div style={{ marginTop: 'var(--spacing-4)' }}>
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

        <div style={{ marginTop: 'var(--spacing-4)' }}>
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
        <LoadingSpinner message="Loading audit events..." />
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
                  <th style={{ width: '40px' }}></th>
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
                    <tr onClick={() => toggleRowExpansion(event.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <button
                          type="button"
                          className="admin-button admin-button-ghost"
                          style={{ padding: '0.25rem 0.5rem', minWidth: 'auto' }}
                          aria-label={expandedRowId === event.id ? 'Collapse details' : 'Expand details'}
                        >
                          {expandedRowId === event.id ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="admin-secondary-text">{formatDate(event.timestamp)}</td>
                      <td>
                        <div>{event.actorDisplayName || 'System'}</div>
                        {event.actorUserId && (
                          <div className="admin-meta-text" style={{ fontSize: '0.75rem' }}>
                            {event.actorUserId}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={getActionBadgeStyle(event.actionType)}>{event.actionType}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{event.resourceType}</div>
                        {event.resourceName && (
                          <div className="admin-secondary-text" style={{ fontSize: '0.8rem' }}>
                            {event.resourceName}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={getOutcomeBadgeStyle(event.outcome)}>{event.outcome}</span>
                      </td>
                    </tr>
                    {expandedRowId === event.id && (
                      <tr className="admin-table-expanded-row">
                        <td colSpan={6} style={{ padding: 'var(--spacing-5)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-4)' }}>
                            <div>
                              <label className="admin-form-label" style={{ marginBottom: '0.25rem' }}>
                                Correlation ID
                              </label>
                              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{event.correlationId || '-'}</div>
                            </div>
                            <div>
                              <label className="admin-form-label" style={{ marginBottom: '0.25rem' }}>
                                IP Address
                              </label>
                              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{event.actorIpAddress || '-'}</div>
                            </div>
                            <div>
                              <label className="admin-form-label" style={{ marginBottom: '0.25rem' }}>
                                Resource ID
                              </label>
                              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{event.resourceId}</div>
                            </div>
                            <div>
                              <label className="admin-form-label" style={{ marginBottom: '0.25rem' }}>
                                Organization
                              </label>
                              <div>{event.organizationName || '-'}</div>
                            </div>
                          </div>
                          {event.failureReason && (
                            <div style={{ marginTop: 'var(--spacing-4)' }}>
                              <label className="admin-form-label" style={{ marginBottom: '0.5rem' }}>
                                Failure Reason
                              </label>
                              <div className="admin-alert admin-alert-error" style={{ marginBottom: 0 }}>
                                {event.failureReason}
                              </div>
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
