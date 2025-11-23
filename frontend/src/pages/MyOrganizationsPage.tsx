import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { membershipsApi } from '../api/membershipsApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import type { MembershipWithOrganizationDto } from '../types/api';

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
      setError('Failed to load your organizations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, [user?.userId]);

  if (loading) {
    return <LoadingSpinner message="Loading your organizations..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchMemberships} />;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>My Organizations</h1>

      {memberships.length === 0 ? (
        <EmptyState message="You are not a member of any organizations yet." />
      ) : (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          {memberships.map((membership) => (
            <div
              key={membership.id}
              style={{
                padding: '1.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                <Link
                  to={`/me/organizations/${membership.organizationId}`}
                  style={{ color: '#007bff', textDecoration: 'none' }}
                >
                  {membership.organizationName}
                </Link>
              </h2>
              <div style={{ marginTop: '0.5rem' }}>
                <strong>Role:</strong> {membership.role}
              </div>
              <div style={{ marginTop: '0.5rem', color: '#6c757d' }}>
                <strong>Joined:</strong>{' '}
                {new Date(membership.createdAt).toLocaleDateString()}
              </div>
              <div style={{ marginTop: '1rem' }}>
                <Link
                  to={`/me/organizations/${membership.organizationId}`}
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                  }}
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
