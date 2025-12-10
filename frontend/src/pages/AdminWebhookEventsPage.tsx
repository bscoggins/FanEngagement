import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { outboundEventsApi } from '../api/outboundEventsApi';
import type { OutboundEventsFilter } from '../api/outboundEventsApi';
import { organizationsApi } from '../api/organizationsApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import type { OutboundEvent, OutboundEventDetails, OutboundEventStatus, Organization } from '../types/api';

const getStatusBadgeClass = (status: OutboundEventStatus): string => {
  switch (status) {
    case 'Pending':
      return 'admin-pill admin-pill-warning';
    case 'Delivered':
      return 'admin-pill admin-pill-success';
    case 'Failed':
      return 'admin-pill admin-pill-danger';
    default:
      return 'admin-pill';
  }
};

const MAX_TRUNCATE_LENGTH = 50;

const truncateError = (error: string | undefined, maxLength: number = MAX_TRUNCATE_LENGTH): string => {
  if (!error) return '-';
  return error.length > maxLength ? `${error.substring(0, maxLength)}...` : error;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
};

export const AdminWebhookEventsPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { showSuccess, showError } = useNotifications();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<OutboundEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<OutboundEventStatus | ''>('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  // Detail modal state
  const [selectedEvent, setSelectedEvent] = useState<OutboundEventDetails | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Retry state
  const [retryingEventId, setRetryingEventId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!orgId) {
      setError('Invalid organization ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const filter: OutboundEventsFilter = {};
      if (statusFilter) {
        filter.status = statusFilter;
      }
      if (eventTypeFilter) {
        filter.eventType = eventTypeFilter;
      }

      const [orgData, eventsData] = await Promise.all([
        organizationsApi.getById(orgId),
        outboundEventsApi.getAll(orgId, filter),
      ]);

      setOrganization(orgData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, statusFilter, eventTypeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetails = async (eventId: string) => {
    if (!orgId) return;

    try {
      setIsDetailLoading(true);
      setShowDetailModal(true);
      const eventDetails = await outboundEventsApi.getById(orgId, eventId);
      setSelectedEvent(eventDetails);
    } catch (err) {
      console.error('Failed to fetch event details:', err);
      const errorMessage = parseApiError(err);
      showError(errorMessage);
      setShowDetailModal(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedEvent(null);
  };

  const handleRetry = async (eventId: string) => {
    if (!orgId) return;

    try {
      setRetryingEventId(eventId);
      await outboundEventsApi.retry(orgId, eventId);
      showSuccess('Event queued for retry successfully!');
      await fetchData();
    } catch (err) {
      console.error('Failed to retry event:', err);
      const errorMessage = parseApiError(err);
      showError(errorMessage);
    } finally {
      setRetryingEventId(null);
    }
  };

  const handleRetryFromModal = async () => {
    if (!selectedEvent) return;
    await handleRetry(selectedEvent.id);
    handleCloseModal();
  };

  const uniqueEventTypes = useMemo(() => {
    const typeSet = new Set<string>();
    events.forEach((evt) => typeSet.add(evt.eventType));
    return Array.from(typeSet).sort();
  }, [events]);

  if (isLoading && !organization) {
    return (
      <div className="admin-page">
        <LoadingSpinner message="Loading webhook events..." />
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
          <h1>Webhook Events</h1>
          <div className="admin-page-subtitle">Organization: {organization.name}</div>
        </div>
        <div className="admin-meta-text">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
          {error}
        </div>
      )}

      <div className="admin-card compact" style={{ marginBottom: 'var(--spacing-5)' }}>
        <div className="admin-filter-row">
          <div>
            <label htmlFor="statusFilter" className="admin-form-label">
              Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OutboundEventStatus | '')}
              className="admin-select"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Delivered">Delivered</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div>
            <label htmlFor="eventTypeFilter" className="admin-form-label">
              Event Type
            </label>
            <select
              id="eventTypeFilter"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="admin-select"
            >
              <option value="">All Event Types</option>
              {uniqueEventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {(statusFilter || eventTypeFilter) && (
            <div className="admin-filter-group">
              {statusFilter && (
                <span className="admin-filter-chip selected">
                  Status: {statusFilter}
                </span>
              )}
              {eventTypeFilter && (
                <span className="admin-filter-chip selected">
                  Type: {eventTypeFilter}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading webhook events..." />
      ) : events.length === 0 ? (
        <div className="admin-empty-state">
          {statusFilter || eventTypeFilter
            ? 'No events found matching your filters.'
            : 'No webhook events found for this organization.'}
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Attempts</th>
                <th>Last Attempt</th>
                <th>Last Error</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.eventType}</td>
                  <td>
                    <span className={getStatusBadgeClass(event.status)}>{event.status}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{event.attemptCount}</td>
                  <td className="admin-secondary-text">{formatDate(event.lastAttemptAt)}</td>
                  <td
                    className="admin-secondary-text"
                    style={{ color: event.lastError ? 'var(--color-error-600)' : undefined }}
                    title={event.lastError || undefined}
                  >
                    {truncateError(event.lastError)}
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <Button
                        onClick={() => handleViewDetails(event.id)}
                        size="sm"
                        variant="primary"
                      >
                        View
                      </Button>
                      {event.status === 'Failed' && (
                        <Button
                          onClick={() => handleRetry(event.id)}
                          isLoading={retryingEventId === event.id}
                          size="sm"
                          variant="secondary"
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showDetailModal} onClose={handleCloseModal} title="Event Details">
        {isDetailLoading ? (
          <LoadingSpinner message="Loading event details..." />
        ) : selectedEvent ? (
          <>
            <div className="admin-card compact" style={{ marginBottom: 'var(--spacing-4)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-4)' }}>
                <div>
                  <label className="admin-form-label" style={{ marginBottom: '0.25rem' }}>Event Type</label>
                  <div>{selectedEvent.eventType}</div>
                </div>
                <div>
                  <label className="admin-form-label" style={{ marginBottom: '0.25rem' }}>Status</label>
                  <span className={getStatusBadgeClass(selectedEvent.status)}>{selectedEvent.status}</span>
                </div>
                <div>
                  <label className="admin-form-label" style={{ marginBottom: '0.25rem' }}>Attempt Count</label>
                  <div>{selectedEvent.attemptCount}</div>
                </div>
                <div>
                  <label className="admin-form-label" style={{ marginBottom: '0.25rem' }}>Created At</label>
                  <div>{formatDate(selectedEvent.createdAt)}</div>
                </div>
                <div>
                  <label className="admin-form-label" style={{ marginBottom: '0.25rem' }}>Last Attempt</label>
                  <div>{formatDate(selectedEvent.lastAttemptAt)}</div>
                </div>
                <div>
                  <label className="admin-form-label" style={{ marginBottom: '0.25rem' }}>Event ID</label>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{selectedEvent.id}</div>
                </div>
              </div>
            </div>

            {selectedEvent.lastError && (
              <div className="admin-alert admin-alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
                {selectedEvent.lastError}
              </div>
            )}

            <div className="admin-card compact" style={{ marginBottom: 'var(--spacing-4)' }}>
              <label className="admin-form-label" style={{ marginBottom: '0.5rem' }}>Payload</label>
              <pre
                style={{
                  padding: 'var(--spacing-4)',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)',
                  margin: 0,
                  maxHeight: '240px',
                  overflow: 'auto',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {(() => {
                  if (!selectedEvent.payload) {
                    return '(No payload)';
                  }
                  try {
                    return JSON.stringify(JSON.parse(selectedEvent.payload), null, 2);
                  } catch {
                    return selectedEvent.payload;
                  }
                })()}
              </pre>
            </div>

            <div className="admin-table-actions" style={{ justifyContent: 'flex-end' }}>
              {selectedEvent.status === 'Failed' && (
                <Button
                  onClick={handleRetryFromModal}
                  isLoading={retryingEventId === selectedEvent.id}
                  variant="secondary"
                >
                  Retry Event
                </Button>
              )}
              <Button
                onClick={handleCloseModal}
                variant="ghost"
              >
                Close
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
};
