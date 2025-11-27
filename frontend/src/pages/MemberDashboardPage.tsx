import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { membershipsApi } from '../api/membershipsApi';
import { proposalsApi } from '../api/proposalsApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { parseApiError } from '../utils/errorUtils';
import type { MembershipWithOrganizationDto, Proposal } from '../types/api';

interface DashboardData {
  memberships: MembershipWithOrganizationDto[];
  activeProposals: { proposal: Proposal; organizationName: string }[];
}

export const MemberDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchDashboardData = useCallback(async () => {
    if (!user?.userId) return;

    try {
      setLoading(true);
      setError('');

      // Fetch user's memberships
      const memberships = await membershipsApi.getByUserId(user.userId);

      // Parallelize proposal fetches for each organization
      const proposalPromises = memberships.map(async (membership) => {
        try {
          const proposals = await proposalsApi.getByOrganization(membership.organizationId);
          const openProposals = proposals.filter(p => p.status === 'Open');
          return openProposals.map(p => ({
            proposal: p,
            organizationName: membership.organizationName,
          }));
        } catch (err) {
          // Continue even if one org fails to load
          console.warn(`Failed to fetch proposals for org ${membership.organizationId}:`, err);
          return [];
        }
      });
      const results = await Promise.all(proposalPromises);
      const activeProposals: { proposal: Proposal; organizationName: string }[] = results.flat();

      setData({ memberships, activeProposals });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchDashboardData} />;
  }

  const displayName = user?.displayName || user?.email || 'Member';

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }} data-testid="member-dashboard">
      {/* Welcome Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#333' }} data-testid="welcome-message">
          Welcome, {displayName}!
        </h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Here's an overview of your fan engagement activity.
        </p>
      </div>

      {/* Dashboard Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* My Organizations Card */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '1.5rem',
          }}
          data-testid="organizations-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>🏢</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>My Organizations</h2>
          </div>
          
          {data?.memberships && data.memberships.length > 0 ? (
            <>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                You are a member of <strong>{data.memberships.length}</strong> organization{data.memberships.length !== 1 ? 's' : ''}.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
                {data.memberships.slice(0, 3).map((membership) => (
                  <li key={membership.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                    <Link
                      to={`/me/organizations/${membership.organizationId}`}
                      style={{ color: '#007bff', textDecoration: 'none' }}
                    >
                      {membership.organizationName}
                    </Link>
                    <span
                      style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.375rem',
                        backgroundColor: membership.role === 'OrgAdmin' ? '#cce5ff' : '#e9ecef',
                        borderRadius: '4px',
                        color: membership.role === 'OrgAdmin' ? '#004085' : '#6c757d',
                      }}
                    >
                      {membership.role}
                    </span>
                  </li>
                ))}
                {data.memberships.length > 3 && (
                  <li style={{ padding: '0.5rem 0', color: '#666', fontStyle: 'italic' }}>
                    and {data.memberships.length - 3} more...
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p style={{ color: '#666', marginBottom: '1rem' }} data-testid="no-organizations">
              You are not a member of any organizations yet.
            </p>
          )}
          
          <Link
            to="/me/organizations"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            View All Organizations →
          </Link>
        </div>

        {/* Active Proposals Card */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '1.5rem',
          }}
          data-testid="active-proposals-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>🗳️</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Active Proposals</h2>
          </div>
          
          {data?.activeProposals && data.activeProposals.length > 0 ? (
            <>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                You have <strong>{data.activeProposals.length}</strong> proposal{data.activeProposals.length !== 1 ? 's' : ''} open for voting.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
                {data.activeProposals.slice(0, 3).map((item) => (
                  <li
                    key={item.proposal.id}
                    style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}
                  >
                    <Link
                      to={`/me/proposals/${item.proposal.id}`}
                      style={{ color: '#007bff', textDecoration: 'none' }}
                    >
                      {item.proposal.title}
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.25rem' }}>
                      {item.organizationName}
                      {item.proposal.endAt && (
                        <> · Ends {new Date(item.proposal.endAt).toLocaleDateString()}</>
                      )}
                    </div>
                  </li>
                ))}
                {data.activeProposals.length > 3 && (
                  <li style={{ padding: '0.5rem 0', color: '#666', fontStyle: 'italic' }}>
                    and {data.activeProposals.length - 3} more...
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p style={{ color: '#666', marginBottom: '1rem' }} data-testid="no-active-proposals">
              No active proposals right now. Check back later!
            </p>
          )}
          
          {data?.memberships && data.memberships.length > 0 && (() => {
            // Determine which organization to highlight
            let targetOrg = data.memberships[0];
            
            // If there are active proposals, find the org with the most
            if (data.activeProposals && data.activeProposals.length > 0) {
              const orgCounts = data.activeProposals.reduce((acc, { proposal }) => {
                acc[proposal.organizationId] = (acc[proposal.organizationId] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              
              const [topOrgId] = Object.entries(orgCounts)
                .sort(([, a], [, b]) => b - a)[0];
              
              targetOrg = data.memberships.find(m => m.organizationId === topOrgId) || targetOrg;
            }
            
            return (
              <Link
                to={`/me/organizations/${targetOrg.organizationId}`}
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
                data-testid="explore-org-button"
              >
                Explore {targetOrg.organizationName} →
              </Link>
            );
          })()}
        </div>

        {/* My Account Card */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '1.5rem',
          }}
          data-testid="account-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>👤</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>My Account</h2>
          </div>
          
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            View and manage your account settings and profile information.
          </p>
          
          <div style={{ marginBottom: '1rem', color: '#666', fontSize: '0.875rem' }}>
            <div><strong>Email:</strong> {user?.email}</div>
            <div><strong>Display Name:</strong> {user?.displayName}</div>
          </div>
          
          <Link
            to="/me"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            Manage Account →
          </Link>
        </div>
      </div>

      {/* Quick Actions Section */}
      {data?.memberships && data.memberships.length === 0 && (
        <div
          style={{
            marginTop: '2rem',
            padding: '2rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center',
          }}
          data-testid="getting-started-section"
        >
          <h2 style={{ marginTop: 0 }}>Getting Started</h2>
          <p style={{ color: '#666' }}>
            You're not a member of any organizations yet. Contact your organization administrator
            to get invited, or reach out to a platform administrator if you need help.
          </p>
        </div>
      )}
    </div>
  );
};
