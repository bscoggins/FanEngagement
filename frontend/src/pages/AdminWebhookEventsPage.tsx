import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { outboundEventsApi } from '../api/outboundEventsApi';
import type { OutboundEventsFilter } from '../api/outboundEventsApi';
import { organizationsApi } from '../api/organizationsApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import type { OutboundEvent, OutboundEventDetails, OutboundEventStatus, Organization } from '../types/api';

const getStatusBadgeStyle = (status: OutboundEventStatus): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: 500,
    display: 'inline-block',
  };

  switch (status) {
    case 'Pending':
      return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
    case 'Delivered':
      return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
    case 'Failed':
      return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
    default:
      return { ...baseStyle, backgroundColor: '#e9ecef', color: '#495057' };
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

  // Get unique event types for the filter dropdown
  const uniqueEventTypes = [...new Set(events.map((e) => e.eventType))].sort();

  if (isLoading) {
    return (
      <div>
        <h1>Webhook Events</h1>
        <LoadingSpinner message="Loading webhook events..." />
      </div>
    );
  }

  if (!organization) {
    return (
      <div>
        <h1>Webhook Events</h1>
        <ErrorMessage message={error || 'Organization not found'} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to={`/admin/organizations/${orgId}/edit`}
          style={{
            color: '#0066cc',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          ← Back to Organization
        </Link>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Webhook Events</h1>
        <div style={{ color: '#666', fontSize: '1rem' }}>
          Organization: {organization.name}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label
            htmlFor="statusFilter"
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
          >
            Status
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OutboundEventStatus | '')}
            style={{
              padding: '0.5rem',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '1rem',
              backgroundColor: 'white',
              minWidth: '150px',
            }}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Delivered">Delivered</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="eventTypeFilter"
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}
          >
            Event Type
          </label>
          <select
            id="eventTypeFilter"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '1rem',
              backgroundColor: 'white',
              minWidth: '200px',
            }}
          >
            <option value="">All Event Types</option>
            {uniqueEventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', color: '#666', fontSize: '0.875rem' }}>
          {events.length} event{events.length !== 1 ? 's' : ''}
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          message={
            statusFilter || eventTypeFilter
              ? 'No events found matching your filters.'
              : 'No webhook events found for this organization.'
          }
        />
      ) : (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Event Type</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Attempts</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Last Attempt</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Last Error</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '1rem' }}>{event.eventType}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={getStatusBadgeStyle(event.status)}>{event.status}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{event.attemptCount}</td>
                  <td style={{ padding: '1rem', color: '#666', fontSize: '0.9rem' }}>
                    {formatDate(event.lastAttemptAt)}
                  </td>
                  <td
                    style={{
                      padding: '1rem',
                      color: event.lastError ? '#c33' : '#666',
                      fontSize: '0.875rem',
                      maxWidth: '200px',
                    }}
                    title={event.lastError || undefined}
                  >
                    {truncateError(event.lastError)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleViewDetails(event.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#0066cc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                        }}
                      >
                        View
                      </button>
                      {event.status === 'Failed' && (
                        <button
                          onClick={() => handleRetry(event.id)}
                          disabled={retryingEventId === event.id}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: retryingEventId === event.id ? '#ccc' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: retryingEventId === event.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          {retryingEventId === event.id ? 'Retrying...' : 'Retry'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '2rem',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {isDetailLoading ? (
              <LoadingSpinner message="Loading event details..." />
            ) : selectedEvent ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0 }}>Event Details</h2>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                        Event Type
                      </label>
                      <div>{selectedEvent.eventType}</div>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                        Status
                      </label>
                      <span style={getStatusBadgeStyle(selectedEvent.status)}>{selectedEvent.status}</span>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                        Attempt Count
                      </label>
                      <div>{selectedEvent.attemptCount}</div>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                        Created At
                      </label>
                      <div>{formatDate(selectedEvent.createdAt)}</div>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                        Last Attempt
                      </label>
                      <div>{formatDate(selectedEvent.lastAttemptAt)}</div>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#666', fontSize: '0.875rem' }}>
                        Event ID
                      </label>
                      <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>{selectedEvent.id}</div>
                    </div>
                  </div>
                </div>

                {selectedEvent.lastError && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
                      Last Error
                    </label>
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '4px',
                        color: '#c33',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {selectedEvent.lastError}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
                    Payload
                  </label>
                  <pre
                    style={{
                      padding: '1rem',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      overflow: 'auto',
                      maxHeight: '200px',
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

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  {selectedEvent.status === 'Failed' && (
                    <button
                      onClick={handleRetryFromModal}
                      disabled={retryingEventId === selectedEvent.id}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: retryingEventId === selectedEvent.id ? '#ccc' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: retryingEventId === selectedEvent.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {retryingEventId === selectedEvent.id ? 'Retrying...' : 'Retry Event'}
                    </button>
                  )}
                  <button
                    onClick={handleCloseModal}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
