import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { membershipsApi } from '../api/membershipsApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { parseApiError } from '../utils/errorUtils';
import type { MembershipWithOrganizationDto } from '../types/api';

const pageContainerStyle: React.CSSProperties = {
  padding: '2rem',
  maxWidth: '960px',
  margin: '0 auto',
};

const organizationsGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: '1rem',
  marginTop: '1rem',
};

const organizationCardStyle: React.CSSProperties = {
  padding: '1.5rem',
  border: '1px solid var(--color-border-default)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--color-surface)',
  boxShadow: 'var(--shadow-xs)',
};

const organizationLinkStyle: React.CSSProperties = {
  color: 'var(--color-primary-600)',
  textDecoration: 'none',
};

const organizationMetaStyle: React.CSSProperties = {
  marginTop: '0.5rem',
  color: 'var(--color-text-secondary)',
};

const viewDetailsButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '1rem',
  padding: '0.5rem 1rem',
  backgroundColor: 'var(--color-primary-600)',
  color: 'var(--color-text-on-primary)',
  textDecoration: 'none',
  borderRadius: 'var(--radius-sm)',
  fontWeight: 600,
  transition: 'background-color var(--duration-fast) var(--ease-out)',
};

export const MyOrganizationsPage: React.FC = () => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<MembershipWithOrganizationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchMemberships = async () => {
    if (!user?.userId) return;

    try {
      setLoading(true);
      setError('');
      const data = await membershipsApi.getByUserId(user.userId);
      setMemberships(data);
    } catch (err) {
      console.error('Failed to fetch memberships:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  if (loading) {
    return <LoadingSpinner message="Loading your organizations..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchMemberships} />;
  }

  return (
    <div style={pageContainerStyle}>
      <h1>My Organizations</h1>

      {memberships.length === 0 ? (
        <EmptyState message="You are not a member of any organizations yet." />
      ) : (
        <div style={organizationsGridStyle}>
          {memberships.map((membership) => (
            <div
              key={membership.id}
              style={organizationCardStyle}
            >
              <h2 style={{ marginTop: 0 }}>
                <Link
                  to={`/me/organizations/${membership.organizationId}`}
                  style={organizationLinkStyle}
                >
                  {membership.organizationName}
                </Link>
              </h2>
              <div style={organizationMetaStyle}>
                <strong>Role:</strong> {membership.role}
              </div>
              <div style={organizationMetaStyle}>
                <strong>Joined:</strong>{' '}
                {new Date(membership.createdAt).toLocaleDateString()}
              </div>
              <Link
                to={`/me/organizations/${membership.organizationId}`}
                style={viewDetailsButtonStyle}
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
