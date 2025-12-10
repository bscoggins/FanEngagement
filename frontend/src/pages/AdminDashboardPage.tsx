import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveOrganization } from '../contexts/OrgContext';
import { IfGlobalAdmin } from '../components/PermissionWrappers';

export const AdminDashboardPage: React.FC = () => {
  const { isGlobalAdmin, memberships, isLoading } = usePermissions();
  const { activeOrg } = useActiveOrganization();
  const navigate = useNavigate();

  // Store the result of isGlobalAdmin() for use in memoization
  const globalAdmin = isGlobalAdmin();

  // Check if user is admin of the active org
  const isActiveOrgAdmin = React.useMemo(() => {
    if (globalAdmin) return true;
    if (!activeOrg) return false;
    return memberships.some(m => m.organizationId === activeOrg.id && m.role === 'OrgAdmin');
  }, [globalAdmin, activeOrg, memberships]);

  // Redirect to the member view if active org is selected and user is not admin of it
  // Only redirect after memberships have loaded to avoid race conditions
  useEffect(() => {
    if (!isLoading && activeOrg && !isActiveOrgAdmin) {
      navigate(`/me/organizations/${activeOrg.id}`, { replace: true });
    }
  }, [isLoading, activeOrg, isActiveOrgAdmin, navigate]);

  // If redirecting, show nothing (will redirect immediately)
  if (!isLoading && activeOrg && !isActiveOrgAdmin) {
    return null;
  }
  
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1>Admin Dashboard</h1>
          <div className="admin-page-subtitle">
            Welcome to the FanEngagement administration area.
          </div>
        </div>
      </div>

      <IfGlobalAdmin>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--spacing-5)',
          }}
        >
          <div className="admin-card compact" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <div>
              <h2 style={{ margin: 0 }}>Users</h2>
              <p className="admin-secondary-text">Manage user accounts and permissions</p>
            </div>
            <Link to="/admin/users" className="admin-link-button">Go to Users</Link>
          </div>

          <div className="admin-card compact" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <div>
              <h2 style={{ margin: 0 }}>Organizations</h2>
              <p className="admin-secondary-text">Manage organizations and memberships</p>
            </div>
            <Link to="/admin/organizations" className="admin-link-button">Go to Organizations</Link>
          </div>

          <div className="admin-card compact" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <div>
              <h2 style={{ margin: 0 }}>Dev Tools</h2>
              <p className="admin-secondary-text">Development and testing utilities</p>
            </div>
            <Link to="/admin/dev-tools" className="admin-link-button">Go to Dev Tools</Link>
          </div>
        </div>
      </IfGlobalAdmin>

      {!isGlobalAdmin() && memberships.length > 0 && (
        <div>
          <h2 style={{ marginTop: 'var(--spacing-6)' }}>Your Organizations</h2>
          <p className="admin-secondary-text">
            You are an organization administrator for the following organizations:
          </p>
          <div style={{ marginTop: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            {memberships
              .filter(m => m.role === 'OrgAdmin')
              .map(membership => (
                <div className="admin-card" key={membership.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-4)' }}>
                    <div>
                      <h3 style={{ marginTop: 0 }}>{membership.organizationName}</h3>
                      <p className="admin-secondary-text" style={{ margin: 0 }}>Org Admin</p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                      <Link className="admin-button admin-button-outline" to={`/admin/organizations/${membership.organizationId}/edit`}>
                        Edit Organization
                      </Link>
                      <Link className="admin-button admin-button-outline" to={`/admin/organizations/${membership.organizationId}/memberships`}>
                        Manage Members
                      </Link>
                      <Link className="admin-button admin-button-outline" to={`/admin/organizations/${membership.organizationId}/share-types`}>
                        Manage Share Types
                      </Link>
                      <Link className="admin-button admin-button-outline" to={`/admin/organizations/${membership.organizationId}/proposals`}>
                        Manage Proposals
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {!isGlobalAdmin() && memberships.filter(m => m.role === 'OrgAdmin').length === 0 && (
        <div className="admin-empty-state">
          <p style={{ marginBottom: '0.5rem' }}>You don't have administrator permissions for any organizations.</p>
          <p style={{ margin: 0 }}>Contact a platform administrator if you need access.</p>
        </div>
      )}
    </div>
  );
};
