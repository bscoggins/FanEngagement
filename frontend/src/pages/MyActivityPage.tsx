import React, { useState, useEffect, useCallback } from 'react';
import { auditEventsApi } from '../api/auditEventsApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { parseApiError } from '../utils/errorUtils';
import type { AuditEvent } from '../types/api';

type DateFilter = 'all' | '7days' | '30days';

const getDateFilterLabel = (filter: DateFilter): string => {
  switch (filter) {
    case '7days':
      return 'Last 7 Days';
    case '30days':
      return 'Last 30 Days';
    case 'all':
    default:
      return 'All Time';
  }
};

const getDateFromFilter = (filter: DateFilter): string | undefined => {
  if (filter === 'all') return undefined;
  
  const now = new Date();
  const daysAgo = filter === '7days' ? 7 : 30;
  const dateFrom = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return dateFrom.toISOString();
};

const getIconForAction = (actionType: string, resourceType: string): string => {
  // Vote-related actions
  if (resourceType === 'Vote') {
    return '🗳️';
  }
  
  // Membership changes
  if (resourceType === 'Membership') {
    if (actionType === 'Created') return '➕';
    if (actionType === 'Deleted') return '👋';
    if (actionType === 'RoleChanged') return '🔄';
  }
  
  // Profile/User updates
  if (resourceType === 'User' && actionType === 'Updated') {
    return '✏️';
  }
  
  // Proposal-related
  if (resourceType === 'Proposal') {
    if (actionType === 'Created') return '📝';
    if (actionType === 'Updated') return '✏️';
  }
  
  // Default icons
  switch (actionType) {
    case 'Created':
      return '➕';
    case 'Updated':
      return '✏️';
    case 'Deleted':
      return '🗑️';
    case 'Accessed':
      return '👁️';
    case 'Authenticated':
      return '🔐';
    default:
      return '📋';
  }
};

const formatActivityDescription = (event: AuditEvent): string => {
  const { actionType, resourceType, resourceName, organizationName } = event;
  
  // Vote actions
  if (resourceType === 'Vote' && actionType === 'Created') {
    return `Voted on proposal${resourceName ? ` "${resourceName}"` : ''}${organizationName ? ` in ${organizationName}` : ''}`;
  }
  
  // Membership changes
  if (resourceType === 'Membership') {
    if (actionType === 'Created') {
      return `Joined organization${organizationName ? ` "${organizationName}"` : ''}`;
    }
    if (actionType === 'Deleted') {
      return `Left organization${organizationName ? ` "${organizationName}"` : ''}`;
    }
    if (actionType === 'RoleChanged') {
      return `Role changed in organization${organizationName ? ` "${organizationName}"` : ''}`;
    }
  }
  
  // Profile updates
  if (resourceType === 'User' && actionType === 'Updated') {
    return 'Updated profile information';
  }
  
  // Proposal actions
  if (resourceType === 'Proposal') {
    if (actionType === 'Created') {
      return `Created proposal${resourceName ? ` "${resourceName}"` : ''}${organizationName ? ` in ${organizationName}` : ''}`;
    }
    if (actionType === 'Updated') {
      return `Updated proposal${resourceName ? ` "${resourceName}"` : ''}${organizationName ? ` in ${organizationName}` : ''}`;
    }
  }
  
  // Generic fallback
  return `${actionType} ${resourceType}${resourceName ? ` "${resourceName}"` : ''}${organizationName ? ` in ${organizationName}` : ''}`;
};

const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffMs = now.getTime() - eventTime.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return eventTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
};

export const MyActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const pageSize = 20;

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const dateFrom = getDateFromFilter(dateFilter);
      const result = await auditEventsApi.getMyActivity({
        dateFrom,
        page: currentPage,
        pageSize,
      });
      
      setActivities(result.items);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
      setHasPreviousPage(result.hasPreviousPage);
      setHasNextPage(result.hasNextPage);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  if (loading) {
    return <LoadingSpinner message="Loading your activity..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchActivities} />;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }} data-testid="my-activity-page">
      <h1>My Activity</h1>
      <p style={{ color: '#6c757d', marginBottom: '2rem' }}>
        View your recent actions and activities across the platform.
      </p>

      {/* Date Filter */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}
        data-testid="activity-date-filters"
      >
        {(['7days', '30days', 'all'] as DateFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => handleDateFilterChange(filter)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: dateFilter === filter ? '#007bff' : 'white',
              color: dateFilter === filter ? 'white' : '#007bff',
              border: '1px solid #007bff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: dateFilter === filter ? 'bold' : 'normal',
            }}
            data-testid={`filter-${filter}`}
          >
            {getDateFilterLabel(filter)}
          </button>
        ))}
      </div>

      {/* Activity Count */}
      {totalCount > 0 && (
        <div style={{ marginBottom: '1rem', color: '#6c757d', fontSize: '0.9rem' }}>
          Showing {activities.length} of {totalCount} activities
        </div>
      )}

      {/* Activity List */}
      {activities.length === 0 ? (
        <EmptyState 
          message={
            dateFilter === 'all'
              ? "You haven't performed any actions yet."
              : `No activities found in the ${getDateFilterLabel(dateFilter).toLowerCase()}.`
          }
        />
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
            data-testid="activity-list"
          >
            {activities.map((event) => (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  alignItems: 'flex-start',
                }}
                data-testid={`activity-item-${event.id}`}
              >
                <span
                  style={{
                    fontSize: '1.5rem',
                    flexShrink: 0,
                  }}
                  aria-label="activity icon"
                >
                  {getIconForAction(event.actionType, event.resourceType)}
                </span>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      marginBottom: '0.25rem',
                      fontWeight: 500,
                    }}
                    data-testid="activity-description"
                  >
                    {formatActivityDescription(event)}
                  </p>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: '#6c757d',
                      display: 'flex',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span data-testid="activity-time">
                      {formatRelativeTime(event.timestamp)}
                    </span>
                    {event.outcome && event.outcome !== 'Success' && (
                      <span
                        style={{
                          color: event.outcome === 'Failure' || event.outcome === 'Denied' ? '#dc3545' : '#ffc107',
                          fontWeight: 500,
                        }}
                        data-testid="activity-outcome"
                      >
                        {event.outcome}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ marginTop: '2rem' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                hasPreviousPage={hasPreviousPage}
                hasNextPage={hasNextPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
