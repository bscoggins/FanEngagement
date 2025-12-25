import React, { useState, useCallback } from 'react';
import { auditEventsApi } from '../api/auditEventsApi';
import { organizationsApi } from '../api/organizationsApi';
import { parseApiError } from '../utils/errorUtils';
import { ACTION_TYPES, RESOURCE_TYPES, getOutcomeBadgeClass, getActionBadgeClass, formatDate } from '../utils/auditUtils';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { Button } from '../components/Button';
import { Skeleton, SkeletonTable, SkeletonTextLines } from '../components/Skeleton';
import './AdminPage.css';
import type { AuditEvent, Organization, PagedResult } from '../types/api';
import { useScrollHint } from '../hooks/useScrollHint';

export const PlatformAdminAuditLogPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [auditEvents, setAuditEvents] = useState<PagedResult<AuditEvent> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeExportFormat, setActiveExportFormat] = useState<'csv' | 'json' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Expandable row state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const tableWrapperRef = useScrollHint<HTMLDivElement>();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const filters = {
        organizationId: selectedOrgId || undefined,
        page,
        pageSize,
        dateFrom: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
        actionType: selectedActionTypes.length > 0 ? selectedActionTypes.join(',') : undefined,
        resourceType: selectedResourceTypes.length > 0 ? selectedResourceTypes.join(',') : undefined,
      };

      const [orgsData, eventsData] = await Promise.all([
        organizationsApi.getAll(),
        auditEventsApi.getAllAcrossOrganizations(filters),
      ]);

      setOrganizations(orgsData);
      setAuditEvents(eventsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrgId, page, pageSize, dateFrom, dateTo, selectedActionTypes, selectedResourceTypes]);

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

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setIsExporting(true);
      setActiveExportFormat(format);
      setError(null);

      const filters = {
        organizationId: selectedOrgId || undefined,
        dateFrom: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
        actionType: selectedActionTypes.length > 0 ? selectedActionTypes.join(',') : undefined,
        resourceType: selectedResourceTypes.length > 0 ? selectedResourceTypes.join(',') : undefined,
      };

      const blob = await auditEventsApi.exportAllAcrossOrganizations(format, filters);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `platform-audit-events-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export audit events:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsExporting(false);
      setActiveExportFormat(null);
    }
  };

  const handleClearFilters = () => {
    setSelectedOrgId('');
    setDateFrom('');
    setDateTo('');
    setSelectedActionTypes([]);
    setSelectedResourceTypes([]);
    setPage(1);
  };

  if (isLoading && organizations.length === 0) {
    return (
      <div className="admin-page" role="status" aria-live="polite">
        <div className="admin-page-header">
          <div className="admin-page-title-group">
            <h1 data-testid="platform-audit-log-heading">Platform Audit Log</h1>
            <div className="admin-page-subtitle">
              Cross-organization audit events for platform-wide security monitoring.
            </div>
          </div>
        </div>
        <div className="admin-card compact" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <SkeletonTextLines count={2} widths={['55%', '35%']} />
          <div className="admin-form" style={{ gap: 'var(--spacing-3)' }}>
            <Skeleton width="12rem" height="2.75rem" />
            <Skeleton width="12rem" height="2.75rem" />
            <Skeleton width="10rem" height="2.75rem" />
            <Skeleton width="10rem" height="2.75rem" />
          </div>
          <SkeletonTable columns={5} rows={6} />
          <p className="admin-secondary-text">Loading audit log...</p>
        </div>
      </div>
    );
  }

  const hasFilters = Boolean(
    selectedOrgId ||
      dateFrom ||
      dateTo ||
      selectedActionTypes.length > 0 ||
      selectedResourceTypes.length > 0
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1 data-testid="platform-audit-log-heading">Platform Audit Log</h1>
          <div className="admin-page-subtitle">
            Cross-organization audit events for platform-wide security monitoring.
          </div>
        </div>
        <div className="admin-page-actions">
          <Button
            variant="primary"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            isLoading={isExporting && activeExportFormat === 'csv'}
            data-testid="export-csv-button"
          >
            {isExporting && activeExportFormat === 'csv' ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
            disabled={isExporting}
            isLoading={isExporting && activeExportFormat === 'json'}
            data-testid="export-json-button"
          >
            {isExporting && activeExportFormat === 'json' ? 'Exporting…' : 'Export JSON'}
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      <div className="admin-card">
        <div className="admin-section-header">
          <div>
            <h2>Filters</h2>
            <p className="admin-secondary-text">
              Refine audit events by organization, timeframe, and activity type.
            </p>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} data-testid="clear-filters-button">
              Clear Filters
            </Button>
          )}
        </div>

        <div className="admin-form">
          <div className="admin-form-field">
            <label className="admin-form-label" htmlFor="organizationFilter">
              Organization
            </label>
            <select
              id="organizationFilter"
              className="admin-select"
              data-testid="organization-filter"
              value={selectedOrgId}
              onChange={(e) => {
                setSelectedOrgId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Organizations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-filter-row">
            <div className="admin-form-field admin-form-field-inline">
              <label className="admin-form-label" htmlFor="dateFrom">
                From Date
              </label>
              <input
                id="dateFrom"
                className="admin-input"
                type="date"
                data-testid="audit-log-filter-date-from"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="admin-form-field admin-form-field-inline">
              <label className="admin-form-label" htmlFor="dateTo">
                To Date
              </label>
              <input
                id="dateTo"
                className="admin-input"
                type="date"
                data-testid="audit-log-filter-date-to"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="admin-form-field">
            <label className="admin-form-label">Action Types</label>
            <div className="admin-filter-group" data-testid="audit-log-filter-action">
              {ACTION_TYPES.map((actionType) => {
                const isSelected = selectedActionTypes.includes(actionType);
                return (
                  <label
                    key={actionType}
                    className={`admin-filter-chip ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleActionTypeChange(actionType)}
                    />
                    {actionType}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="admin-form-field">
            <label className="admin-form-label">Resource Types</label>
            <div className="admin-filter-group" data-testid="audit-log-filter-resource">
              {RESOURCE_TYPES.map((resourceType) => {
                const isSelected = selectedResourceTypes.includes(resourceType);
                return (
                  <label
                    key={resourceType}
                    className={`admin-filter-chip ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleResourceTypeChange(resourceType)}
                    />
                    {resourceType}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="admin-table-meta" data-testid="audit-log-pagination">
        <div className="admin-form-field admin-form-field-inline">
          <label className="admin-form-label" htmlFor="pageSize">
            Items per page
          </label>
          <select id="pageSize" className="admin-select" value={pageSize} onChange={handlePageSizeChange}>
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
        <div className="admin-card compact" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }} role="status" aria-live="polite">
          <SkeletonTextLines count={2} widths={['55%', '35%']} />
          <SkeletonTable columns={7} rows={7} />
          <p className="admin-secondary-text" style={{ margin: 0 }}>
            Loading audit events...
          </p>
        </div>
      ) : !auditEvents || auditEvents.items.length === 0 ? (
        <EmptyState
          message={
            selectedOrgId || dateFrom || dateTo || selectedActionTypes.length > 0 || selectedResourceTypes.length > 0
              ? 'No audit events found matching your filters.'
              : 'No audit events found.'
          }
        />
      ) : (
        <>
          <div
            className="admin-table-wrapper admin-table-wrapper--sticky admin-table-wrapper--scroll-hint"
            ref={tableWrapperRef}
          >
            <table data-testid="audit-log-table" className="admin-table">
              <thead>
                <tr>
                  <th className="admin-table-toggle-column"></th>
                  <th>Organization</th>
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
                        <div className="admin-meta-text admin-meta-text-primary">
                          {event.organizationName || '-'}
                        </div>
                      </td>
                      <td>
                        <div className="admin-meta-text">{formatDate(event.timestamp)}</div>
                      </td>
                      <td>
                        <div className="admin-meta-text admin-meta-text-primary">
                          {event.actorDisplayName || 'System'}
                        </div>
                        {event.actorUserId && <div className="admin-secondary-text">{event.actorUserId}</div>}
                      </td>
                      <td>
                        <span className={getActionBadgeClass(event.actionType)}>{event.actionType}</span>
                      </td>
                      <td>
                        <div className="admin-meta-text admin-meta-text-primary admin-meta-text-strong">
                          {event.resourceType}
                        </div>
                        {event.resourceName && <div className="admin-secondary-text">{event.resourceName}</div>}
                      </td>
                      <td>
                        <span className={getOutcomeBadgeClass(event.outcome)}>{event.outcome}</span>
                      </td>
                    </tr>
                    {expandedRowId === event.id && (
                      <tr className="admin-table-expanded-row">
                        <td colSpan={7}>
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
                              <span className="admin-detail-label">Organization ID</span>
                              <div className="admin-mono">{event.organizationId || '-'}</div>
                            </div>
                          </div>
                          {event.failureReason && (
                            <div className="admin-form-field">
                              <span className="admin-detail-label">Failure Reason</span>
                              <div className="admin-alert admin-alert-error admin-preformatted">
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
