import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useOrgBranding, DEFAULT_PRIMARY_COLOR } from '../hooks/useOrgBranding';
import { ResponsiveImage } from '../components/ResponsiveImage';
import { organizationsApi } from '../api/organizationsApi';
import { shareBalancesApi } from '../api/shareBalancesApi';
import { proposalsApi } from '../api/proposalsApi';
import type { Organization, ShareBalance, Proposal } from '../types/api';

export const MyOrganizationPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();
  const { isOrgAdmin } = usePermissions();
  const branding = useOrgBranding(orgId);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [balances, setBalances] = useState<ShareBalance[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!orgId || !user?.userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [orgData, balanceData, proposalData] = await Promise.all([
          organizationsApi.getById(orgId),
          shareBalancesApi.getBalances(orgId, user.userId),
          proposalsApi.getByOrganization(orgId),
        ]);

        setOrganization(orgData);
        setBalances(balanceData);
        // Filter to show only Open proposals
        setProposals(proposalData.filter((p) => p.status === 'Open'));
      } catch (err) {
        console.error('Failed to fetch organization data:', err);
        setError('Failed to load organization information.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, user?.userId]);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: '#dc3545' }}>{error}</div>;
  }

  if (!organization) {
    return <div style={{ padding: '2rem' }}>Organization not found.</div>;
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Draft: '#6c757d',
      Open: '#28a745',
      Closed: '#dc3545',
      Finalized: '#007bff',
    };
    return (
      <span
        style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: colors[status] || '#6c757d',
          color: 'white',
          borderRadius: '4px',
          fontSize: '0.875rem',
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div>
      {/* Branded Header */}
      {branding.logoUrl || branding.primaryColor !== DEFAULT_PRIMARY_COLOR ? (
        <div
          style={{
            backgroundColor: branding.primaryColor,
            color: 'white',
            padding: '1.5rem 2rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          {branding.logoUrl && (
            <ResponsiveImage
              src={branding.logoUrl}
              alt={`${organization.name} logo`}
              loading="eager"
              decoding="async"
              sizes="(max-width: 768px) 30vw, 120px"
              style={{
                maxHeight: '60px',
                maxWidth: '120px',
                objectFit: 'contain',
              }}
            />
          )}
          <div>
            <h1 style={{ margin: 0, color: 'white' }}>{organization.name}</h1>
            {organization.description && (
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
                {organization.description}
              </p>
            )}
          </div>
        </div>
      ) : null}

      <div style={{ padding: '0 2rem 2rem 2rem' }}>
        {/* Show traditional header if no branding */}
        {!branding.logoUrl && branding.primaryColor === DEFAULT_PRIMARY_COLOR && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 style={{ margin: 0 }}>{organization.name}</h1>
              {orgId && isOrgAdmin(orgId) && (
                <span style={{ 
                  padding: '0.25rem 0.75rem', 
                  backgroundColor: '#17a2b8', 
                  color: 'white', 
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}>
                  Org Admin
                </span>
              )}
            </div>
            {organization.description && (
              <p style={{ color: '#6c757d', marginTop: '0.5rem' }}>
                {organization.description}
              </p>
            )}
          </>
        )}

        {/* Admin badge for branded header */}
        {(branding.logoUrl || branding.primaryColor !== DEFAULT_PRIMARY_COLOR) && orgId && isOrgAdmin(orgId) && (
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ 
              padding: '0.25rem 0.75rem', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}>
              Org Admin
            </span>
          </div>
        )}
      
      {orgId && isOrgAdmin(orgId) && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          backgroundColor: branding.primaryColor ? `color-mix(in srgb, ${branding.primaryColor} 8%, transparent)` : '#e7f3ff', 
          borderLeft: `4px solid ${branding.primaryColor || '#17a2b8'}`,
          borderRadius: '4px'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Admin Actions:</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to={`/admin/organizations/${orgId}/edit`}>Edit Organization</Link>
            <Link to={`/admin/organizations/${orgId}/memberships`}>Manage Members</Link>
            <Link to={`/admin/organizations/${orgId}/share-types`}>Manage Share Types</Link>
            <Link to={`/admin/organizations/${orgId}/proposals`}>Manage Proposals</Link>
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h2>Your Share Balances</h2>
        {balances.length === 0 ? (
          <p>You don't have any shares in this organization yet.</p>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {balances.map((balance) => (
              <div
                key={balance.shareTypeId}
                style={{
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>{balance.shareTypeName}</strong> ({balance.shareTypeSymbol})
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                  {balance.balance}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Active Proposals</h2>
        {proposals.length === 0 ? (
          <p>There are no active proposals at the moment.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                style={{
                  padding: '1.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '0.5rem',
                  }}
                >
                  <h3 style={{ margin: 0 }}>{proposal.title}</h3>
                  {getStatusBadge(proposal.status)}
                </div>
                {proposal.description && (
                  <p style={{ color: '#6c757d', marginTop: '0.5rem' }}>
                    {proposal.description}
                  </p>
                )}
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6c757d' }}>
                  {proposal.endAt && (
                    <div>
                      <strong>Ends:</strong>{' '}
                      {new Date(proposal.endAt).toLocaleString()}
                    </div>
                  )}
                  {proposal.quorumRequirement && (
                    <div>
                      <strong>Quorum:</strong> {proposal.quorumRequirement}%
                    </div>
                  )}
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <Link
                    to={`/me/proposals/${proposal.id}`}
                    style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      backgroundColor: branding.primaryColor,
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                    }}
                  >
                    View & Vote
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
