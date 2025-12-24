import React, { useState, useEffect, useCallback } from 'react';
import { auditEventsApi } from '../api/auditEventsApi';
import { Skeleton, SkeletonList, SkeletonTextLines } from '../components/Skeleton';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { parseApiError } from '../utils/errorUtils';
import { formatRelativeTime } from '../utils/proposalUtils';
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

const pageContainerStyle: React.CSSProperties = {
  padding: '2rem',
  maxWidth: '1200px',
  margin: '0 auto',
};

const subtitleStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  marginBottom: '2rem',
};

const filterGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  marginBottom: '2rem',
  flexWrap: 'wrap',
};

const filterButtonBase: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid transparent',
  cursor: 'pointer',
  fontWeight: 500,
  transition: 'background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out)',
};

const filterButtonActive: React.CSSProperties = {
  backgroundColor: 'var(--color-primary-600)',
  color: 'var(--color-text-on-primary)',
  borderColor: 'var(--color-primary-600)',
  boxShadow: '0 0 0 6px rgba(0, 123, 255, 0.15)',
};

const filterButtonInactive: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-primary-600)',
  borderColor: 'var(--color-primary-200)',
};

const summaryTextStyle: React.CSSProperties = {
  marginBottom: '1rem',
  color: 'var(--color-text-secondary)',
  fontSize: '0.9rem',
};

const activityListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const activityCardStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  padding: '1rem',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-surface)',
  alignItems: 'flex-start',
  boxShadow: 'var(--shadow-xs)',
};

const activityIconStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  flexShrink: 0,
};

const activityDescriptionStyle: React.CSSProperties = {
  margin: 0,
  marginBottom: '0.25rem',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
};

const activityMetaStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-text-secondary)',
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
};

const outcomeStyles: Record<'failure' | 'warning', React.CSSProperties> = {
  failure: { color: 'var(--color-error-600)', fontWeight: 600 },
  warning: { color: 'var(--color-warning-600)', fontWeight: 600 },
};

const paginationWrapperStyle: React.CSSProperties = { marginTop: '2rem' };

const getFilterButtonStyle = (isActive: boolean): React.CSSProperties => ({
  ...filterButtonBase,
  ...(isActive ? filterButtonActive : filterButtonInactive),
});

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
  }, [dateFilter, currentPage]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  if (loading) {
    return (
      <div style={pageContainerStyle} role="status" aria-live="polite">
        <h1>My Activity</h1>
        <p style={subtitleStyle}>
          View your recent actions and activities across the platform.
        </p>
        <div style={{ ...filterGroupStyle, gap: 'var(--spacing-2)' }}>
          {(['7days', '30days', 'all'] as DateFilter[]).map((filter) => (
            <Skeleton
              key={filter}
              variant="rect"
              width="7.5rem"
              height="2.75rem"
              borderRadius="md"
            />
          ))}
        </div>
        <SkeletonTextLines count={2} widths={['60%', '40%']} />
        <SkeletonList items={4} withAvatar linesPerItem={2} />
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-4)' }}>
          Loading your activity...
        </p>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchActivities} />;
  }

  return (
    <div style={pageContainerStyle} data-testid="my-activity-page">
      <h1>My Activity</h1>
      <p style={subtitleStyle}>
        View your recent actions and activities across the platform.
      </p>

      {/* Date Filter */}
      <div
        style={filterGroupStyle}
        data-testid="activity-date-filters"
      >
        {(['7days', '30days', 'all'] as DateFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => handleDateFilterChange(filter)}
            style={getFilterButtonStyle(dateFilter === filter)}
            data-testid={`filter-${filter}`}
          >
            {getDateFilterLabel(filter)}
          </button>
        ))}
      </div>

      {/* Activity Count */}
      {totalCount > 0 && (
        <div style={summaryTextStyle}>
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
            style={activityListStyle}
            data-testid="activity-list"
          >
            {activities.map((event) => (
              <div
                key={event.id}
                style={activityCardStyle}
                data-testid={`activity-item-${event.id}`}
              >
                <span
                  style={activityIconStyle}
                  aria-label={`${event.actionType} ${event.resourceType}`}
                >
                  {getIconForAction(event.actionType, event.resourceType)}
                </span>
                <div style={{ flex: 1 }}>
                  <p
                    style={activityDescriptionStyle}
                    data-testid="activity-description"
                  >
                    {formatActivityDescription(event)}
                  </p>
                  <div
                    style={activityMetaStyle}
                  >
                    <span data-testid="activity-time">
                      {formatRelativeTime(event.timestamp)}
                    </span>
                    {event.outcome && event.outcome !== 'Success' && (
                      <span
                        style={event.outcome === 'Failure' || event.outcome === 'Denied' ? outcomeStyles.failure : outcomeStyles.warning}
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
            <div style={paginationWrapperStyle}>
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
