import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useActiveOrganization } from '../contexts/OrgContext';
import { membershipsApi } from '../api/membershipsApi';
import { proposalsApi } from '../api/proposalsApi';
import { SkeletonCardGrid, SkeletonList, SkeletonTextLines } from '../components/Skeleton';
import { ErrorMessage } from '../components/ErrorMessage';
import { parseApiError } from '../utils/errorUtils';
import type { MembershipWithOrganizationDto, Proposal } from '../types/api';

interface DashboardData {
  memberships: MembershipWithOrganizationDto[];
  activeProposals: { proposal: Proposal; organizationName: string }[];
}

/**
 * Determines which organization to highlight for the "Explore" button.
 * If there are active proposals, returns the org with the most proposals.
 * Otherwise, returns the first organization.
 */
const getTargetOrganization = (
  memberships: MembershipWithOrganizationDto[],
  activeProposals: { proposal: Proposal; organizationName: string }[]
): MembershipWithOrganizationDto | null => {
  if (memberships.length === 0) return null;
  
  let targetOrg = memberships[0];
  
  if (activeProposals.length > 0) {
    const orgCounts = activeProposals.reduce((acc, { proposal }) => {
      acc[proposal.organizationId] = (acc[proposal.organizationId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const [topOrgId] = Object.entries(orgCounts)
      .sort(([, a], [, b]) => b - a)[0];
    
    targetOrg = memberships.find(m => m.organizationId === topOrgId) || targetOrg;
  }
  
  return targetOrg;
};

const pageStyle: React.CSSProperties = {
  padding: '2rem',
  maxWidth: '1200px',
  margin: '0 auto',
};

const welcomeHeadingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '2rem',
  color: 'var(--color-text-primary)',
};

const welcomeSubheadingStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  marginTop: '0.5rem',
};

const cardGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.5rem',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border-default)',
  boxShadow: 'var(--shadow-md)',
  padding: '1.5rem',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '1rem',
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.25rem',
  color: 'var(--color-text-primary)',
};

const mutedTextStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  marginBottom: '1rem',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: '0 0 1rem 0',
};

const listItemStyle: React.CSSProperties = {
  padding: '0.5rem 0',
  borderBottom: '1px solid var(--color-border-subtle)',
};

const listOverflowStyle: React.CSSProperties = {
  padding: '0.5rem 0',
  color: 'var(--color-text-secondary)',
  fontStyle: 'italic',
};

const metaTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-text-secondary)',
  marginTop: '0.25rem',
};

const inlineLinkStyle: React.CSSProperties = {
  color: 'var(--color-primary-500)',
  textDecoration: 'none',
  fontWeight: 500,
};

const buttonBaseStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.5rem 1rem',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.875rem',
  textDecoration: 'none',
  fontWeight: 600,
  transition: 'filter var(--duration-fast) var(--ease-out)',
};

const buttonVariants: Record<'primary' | 'success' | 'neutral', React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-primary-600)',
    color: 'var(--color-text-on-primary)',
  },
  success: {
    backgroundColor: 'var(--color-success-600)',
    color: 'var(--color-text-inverse)',
  },
  neutral: {
    backgroundColor: 'var(--color-border-dark)',
    color: 'var(--color-text-inverse)',
  },
};

const badgeBaseStyle: React.CSSProperties = {
  marginLeft: '0.5rem',
  fontSize: '0.75rem',
  padding: '0.125rem 0.375rem',
  borderRadius: 'var(--radius-sm)',
  fontWeight: 600,
  textTransform: 'capitalize',
  border: '1px solid transparent',
};

const orgAdminBadgeStyle: React.CSSProperties = {
  backgroundColor: 'rgba(0, 123, 255, 0.18)',
  borderColor: 'rgba(0, 123, 255, 0.45)',
  color: 'var(--color-primary-50)',
};

const memberBadgeStyle: React.CSSProperties = {
  backgroundColor: 'rgba(148, 163, 184, 0.22)',
  borderColor: 'var(--color-border-default)',
  color: 'var(--color-text-secondary)',
};

const emptyStateStyle: React.CSSProperties = {
  marginTop: '2rem',
  padding: '2rem',
  backgroundColor: 'var(--color-surface)',
  border: '1px dashed var(--color-border-default)',
  borderRadius: 'var(--radius-lg)',
  textAlign: 'center',
};

const getRoleBadgeStyle = (role: string): React.CSSProperties => {
  if (role === 'OrgAdmin') {
    return { ...badgeBaseStyle, ...orgAdminBadgeStyle };
  }

  return { ...badgeBaseStyle, ...memberBadgeStyle };
};

export const MemberDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { activeOrg } = useActiveOrganization();
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

  // Filter memberships to display based on active org context
  // If active org is a Member org, only show Member orgs
  // Otherwise, show all orgs (for admin users or when no active org)
  const displayedMemberships = useMemo(() => {
    if (!data?.memberships) return [];
    
    // If active org is a Member role org, filter to only show Member orgs
    if (activeOrg && activeOrg.role === 'Member') {
      return data.memberships.filter(m => m.role === 'Member');
    }
    
    // Otherwise show all memberships
    return data.memberships;
  }, [data?.memberships, activeOrg]);

  if (loading) {
    return (
      <div style={pageStyle} role="status" aria-live="polite">
        <h1 style={welcomeHeadingStyle}>Welcome!</h1>
        <SkeletonTextLines count={2} widths={['70%', '50%']} />
        <div style={{ marginTop: 'var(--spacing-4)', marginBottom: 'var(--spacing-4)' }}>
          <SkeletonCardGrid items={3} linesPerCard={2} />
        </div>
        <SkeletonTextLines count={1} widths={['40%']} />
        <SkeletonList items={4} withAvatar linesPerItem={2} />
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-4)' }}>
          Loading your dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchDashboardData} />;
  }

  const displayName = user?.displayName || user?.email || 'Member';

  return (
    <div style={pageStyle} data-testid="member-dashboard">
      {/* Welcome Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={welcomeHeadingStyle} data-testid="welcome-message">
          Welcome, {displayName}!
        </h1>
        <p style={welcomeSubheadingStyle}>
          Here's an overview of your fan engagement activity.
        </p>
      </div>

      {/* Dashboard Grid */}
      <div style={cardGridStyle}>
        {/* My Organizations Card */}
        <div style={cardStyle} data-testid="organizations-card">
          <div style={cardHeaderStyle}>
            <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>🏢</span>
            <h2 style={cardTitleStyle}>My Organizations</h2>
          </div>
          
          {displayedMemberships.length > 0 ? (
            <>
              <p style={mutedTextStyle}>
                You are a member of <strong>{displayedMemberships.length}</strong> organization{displayedMemberships.length !== 1 ? 's' : ''}.
              </p>
              <ul style={listStyle}>
                {displayedMemberships.slice(0, 3).map((membership) => (
                  <li key={membership.id} style={listItemStyle}>
                    <Link
                      to={`/me/organizations/${membership.organizationId}`}
                      style={inlineLinkStyle}
                    >
                      {membership.organizationName}
                    </Link>
                    <span style={getRoleBadgeStyle(membership.role)}>
                      {membership.role}
                    </span>
                  </li>
                ))}
                {displayedMemberships.length > 3 && (
                  <li style={listOverflowStyle}>
                    and {displayedMemberships.length - 3} more...
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p style={mutedTextStyle} data-testid="no-organizations">
              You are not a member of any organizations yet.
            </p>
          )}
          
          <Link
            to="/me/organizations"
            style={{ ...buttonBaseStyle, ...buttonVariants.primary }}
          >
            View All Organizations →
          </Link>
        </div>

        {/* Active Proposals Card */}
        <div style={cardStyle} data-testid="active-proposals-card">
          <div style={cardHeaderStyle}>
            <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>🗳️</span>
            <h2 style={cardTitleStyle}>Active Proposals</h2>
          </div>
          
          {data?.activeProposals && data.activeProposals.length > 0 ? (
            <>
              <p style={mutedTextStyle}>
                You have <strong>{data.activeProposals.length}</strong> proposal{data.activeProposals.length !== 1 ? 's' : ''} open for voting.
              </p>
              <ul style={listStyle}>
                {data.activeProposals.slice(0, 3).map((item) => (
                  <li
                    key={item.proposal.id}
                    style={listItemStyle}
                  >
                    <Link
                      to={`/me/proposals/${item.proposal.id}`}
                      style={inlineLinkStyle}
                    >
                      {item.proposal.title}
                    </Link>
                    <div style={metaTextStyle}>
                      {item.organizationName}
                      {item.proposal.endAt && (
                        <> · Ends {new Date(item.proposal.endAt).toLocaleDateString()}</>
                      )}
                    </div>
                  </li>
                ))}
                {data.activeProposals.length > 3 && (
                  <li style={listOverflowStyle}>
                    and {data.activeProposals.length - 3} more...
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p style={mutedTextStyle} data-testid="no-active-proposals">
              No active proposals right now. Check back later!
            </p>
          )}
          
          {(() => {
            const targetOrg = getTargetOrganization(displayedMemberships, data?.activeProposals || []);
            if (!targetOrg) return null;
            
            return (
              <Link
                to={`/me/organizations/${targetOrg.organizationId}`}
                style={{ ...buttonBaseStyle, ...buttonVariants.success }}
                data-testid="explore-org-button"
              >
                Explore {targetOrg.organizationName} →
              </Link>
            );
          })()}
        </div>

        {/* My Account Card */}
        <div style={cardStyle} data-testid="account-card">
          <div style={cardHeaderStyle}>
            <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>👤</span>
            <h2 style={cardTitleStyle}>My Account</h2>
          </div>
          
          <p style={mutedTextStyle}>
            View and manage your account settings and profile information.
          </p>
          
          <div style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            <div><strong>Email:</strong> {user?.email}</div>
            <div><strong>Display Name:</strong> {user?.displayName}</div>
          </div>
          
          <Link
            to="/me"
            style={{ ...buttonBaseStyle, ...buttonVariants.neutral }}
          >
            Manage Account →
          </Link>
        </div>
      </div>

      {/* Quick Actions Section */}
      {data?.memberships && data.memberships.length === 0 && (
        <div
          style={emptyStateStyle}
          data-testid="getting-started-section"
        >
          <h2 style={{ marginTop: 0 }}>Getting Started</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 0 }}>
            You're not a member of any organizations yet. Contact your organization administrator
            to get invited, or reach out to a platform administrator if you need help.
          </p>
        </div>
      )}
    </div>
  );
};
