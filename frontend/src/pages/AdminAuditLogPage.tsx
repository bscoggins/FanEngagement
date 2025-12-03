import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { auditEventsApi } from '../api/auditEventsApi';
import { organizationsApi } from '../api/organizationsApi';
import { parseApiError } from '../utils/errorUtils';
import { ACTION_TYPES, RESOURCE_TYPES, getOutcomeBadgeStyle, getActionBadgeStyle, formatDate } from '../utils/auditUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import type { AuditEvent, Organization, PagedResult } from '../types/api';

export const AdminAuditLogPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [auditEvents, setAuditEvents] = useState<PagedResult<AuditEvent> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Expandable row state
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
      console.error('Failed to fetch data:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, page, pageSize, dateFrom, dateTo, selectedActionTypes, selectedResourceTypes]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActionTypeChange = (actionType: string) => {
    setSelectedActionTypes((prev) =>
      prev.includes(actionType)
        ? prev.filter((t) => t !== actionType)
        : [...prev, actionType]
    );
    setPage(1); // Reset to first page when filter changes
  };

  const handleResourceTypeChange = (resourceType: string) => {
    setSelectedResourceTypes((prev) =>
      prev.includes(resourceType)
        ? prev.filter((t) => t !== resourceType)
        : [...prev, resourceType]
    );
    setPage(1); // Reset to first page when filter changes
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
      <div>
        <h1 data-testid="audit-log-heading">Audit Log</h1>
        <LoadingSpinner message="Loading audit log..." />
      </div>
    );
  }

  if (!organization) {
    return (
      <div>
        <h1 data-testid="audit-log-heading">Audit Log</h1>
        <ErrorMessage message={error || 'Organization not found'} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 data-testid="audit-log-heading">Audit Log</h1>
        <div style={{ color: '#666', fontSize: '1rem' }}>
          Organization: {organization.name}
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {/* Filters */}
      <div
        style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Filters</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Date range */}
          <div>
            <label
              htmlFor="dateFrom"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
            >
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
              style={{
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '1rem',
                width: '100%',
              }}
            />
          </div>
          
          <div>
            <label
              htmlFor="dateTo"
              style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
            >
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
              style={{
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '1rem',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Action types */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
            Action Types
          </label>
          <div
            data-testid="audit-log-filter-action"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              padding: '0.5rem',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa',
            }}
          >
            {ACTION_TYPES.map((actionType) => (
              <label
                key={actionType}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: selectedActionTypes.includes(actionType) ? '#0066cc' : 'white',
                  color: selectedActionTypes.includes(actionType) ? 'white' : '#333',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedActionTypes.includes(actionType)}
                  onChange={() => handleActionTypeChange(actionType)}
                  style={{ margin: 0 }}
                />
                {actionType}
              </label>
            ))}
          </div>
        </div>

        {/* Resource types */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
            Resource Types
          </label>
          <div
            data-testid="audit-log-filter-resource"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              padding: '0.5rem',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa',
            }}
          >
            {RESOURCE_TYPES.map((resourceType) => (
              <label
                key={resourceType}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: selectedResourceTypes.includes(resourceType) ? '#0066cc' : 'white',
                  color: selectedResourceTypes.includes(resourceType) ? 'white' : '#333',
                  borderRadius: '4px',
                  border: '1px solid #dee2e6',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedResourceTypes.includes(resourceType)}
                  onChange={() => handleResourceTypeChange(resourceType)}
                  style={{ margin: 0 }}
                />
                {resourceType}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination controls */}
      <div
        data-testid="audit-log-pagination"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="pageSize" style={{ fontSize: '0.875rem', color: '#666' }}>
            Items per page:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={handlePageSizeChange}
            style={{
              padding: '0.5rem',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <div style={{ color: '#666', fontSize: '0.875rem' }}>
          {auditEvents ? `${auditEvents.totalCount} total events` : '0 events'}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading audit events..." />
      ) : !auditEvents || auditEvents.items.length === 0 ? (
        <EmptyState
          message={
            dateFrom || dateTo || selectedActionTypes.length > 0 || selectedResourceTypes.length > 0
              ? 'No audit events found matching your filters.'
              : 'No audit events found for this organization.'
          }
        />
      ) : (
        <>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <table data-testid="audit-log-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, width: '30px' }}></th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Actor</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Resource</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.items.map((event) => (
                  <React.Fragment key={event.id}>
                    <tr 
                      style={{ borderBottom: '1px solid #dee2e6', cursor: 'pointer' }}
                      onClick={() => toggleRowExpansion(event.id)}
                    >
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: 0,
                            color: '#666',
                          }}
                          aria-label={expandedRowId === event.id ? 'Collapse details' : 'Expand details'}
                        >
                          {expandedRowId === event.id ? '▼' : '▶'}
                        </button>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#666' }}>
                        {formatDate(event.timestamp)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.875rem' }}>
                          {event.actorDisplayName || 'System'}
                        </div>
                        {event.actorUserId && (
                          <div style={{ fontSize: '0.75rem', color: '#999' }}>
                            {event.actorUserId}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={getActionBadgeStyle(event.actionType)}>
                          {event.actionType}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {event.resourceType}
                        </div>
                        {event.resourceName && (
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                            {event.resourceName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={getOutcomeBadgeStyle(event.outcome)}>
                          {event.outcome}
                        </span>
                      </td>
                    </tr>
                    {expandedRowId === event.id && (
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                        <td colSpan={6} style={{ padding: '1.5rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                                Correlation ID
                              </label>
                              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                                {event.correlationId || '-'}
                              </div>
                            </div>
                            <div>
                              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                                IP Address
                              </label>
                              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                                {event.actorIpAddress || '-'}
                              </div>
                            </div>
                            <div>
                              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                                Resource ID
                              </label>
                              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                                {event.resourceId}
                              </div>
                            </div>
                            <div>
                              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                                Organization
                              </label>
                              <div style={{ fontSize: '0.875rem' }}>
                                {event.organizationName || '-'}
                              </div>
                            </div>
                          </div>
                          {event.failureReason && (
                            <div style={{ marginTop: '1rem' }}>
                              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
                                Failure Reason
                              </label>
                              <div
                                style={{
                                  padding: '0.75rem',
                                  backgroundColor: '#fee',
                                  border: '1px solid #fcc',
                                  borderRadius: '4px',
                                  color: '#c33',
                                  fontSize: '0.875rem',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                }}
                              >
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
