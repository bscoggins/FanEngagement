import React, { useEffect, useMemo, useCallback } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveOrganization } from '../contexts/OrgContext';
import { getDefaultHomeRoute, getVisibleNavItems, getResolvedNavItem, type NavContext } from '../navigation';
import type { MembershipWithOrganizationDto } from '../types/api';
import './AdminLayout.css';

export const AdminLayout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const { isGlobalAdmin, memberships } = usePermissions();
  const { activeOrg, setActiveOrg, memberships: orgMemberships } = useActiveOrganization();
  const navigate = useNavigate();
  const location = useLocation();

  // Build navigation context
  const navContext: NavContext = useMemo(() => ({
    isAuthenticated: true,
    isPlatformAdmin: isAdmin,
    activeOrgId: activeOrg?.id,
    activeOrgRole: activeOrg?.role,
    memberships,
  }), [isAdmin, activeOrg?.id, activeOrg?.role, memberships]);

  // Get visible global nav items (platform-wide)
  const globalNavItems = useMemo(() => {
    const items = getVisibleNavItems(navContext, { scope: 'global' });
    return items.map(item => getResolvedNavItem(item, navContext));
  }, [navContext]);

  // Get visible org-scoped nav items (when org is selected and user has OrgAdmin role for that org)
  const orgNavItems = useMemo(() => {
    const items = getVisibleNavItems(navContext, { scope: 'org' });
    return items.map(item => getResolvedNavItem(item, navContext));
  }, [navContext]);

  // Get the appropriate home route
  const homeRoute = useMemo(() => {
    return getDefaultHomeRoute(navContext);
  }, [navContext]);

  // Check if user is OrgAdmin for a specific organization
  const isOrgAdminForOrg = useCallback((orgId: string): boolean => {
    if (isAdmin) return true;
    const membership = orgMemberships.find(m => m.organizationId === orgId);
    return membership?.role === 'OrgAdmin';
  }, [isAdmin, orgMemberships]);

  // Handle organization selection change
  const handleOrgChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const orgId = e.target.value;
    const membership = orgMemberships.find(m => m.organizationId === orgId);
    if (membership) {
      setActiveOrg({
        id: membership.organizationId,
        name: membership.organizationName,
        role: membership.role,
      });

      // Navigate based on role in the new org
      if (isOrgAdminForOrg(membership.organizationId)) {
        // Navigate to org admin overview
        navigate(`/admin/organizations/${membership.organizationId}/edit`);
      } else {
        // Navigate to member view for this org
        navigate(`/me/organizations/${membership.organizationId}`);
      }
    }
  }, [orgMemberships, setActiveOrg, isOrgAdminForOrg, navigate]);

  // Listen for auth:logout events from the API client
  useEffect(() => {
    const handleAuthLogout = () => {
      logout();
      navigate('/login');
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper to check if a nav item is active
  const isNavItemActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Check if active org has admin role
  const activeOrgIsAdmin = activeOrg && isOrgAdminForOrg(activeOrg.id);

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <h1>FanEngagement Admin</h1>
        <div className="admin-header-right">
          {isGlobalAdmin() && (
            <span className="admin-badge" style={{ 
              marginRight: '1rem', 
              padding: '0.25rem 0.75rem', 
              backgroundColor: '#dc3545', 
              color: 'white', 
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}>
              Platform Admin
            </span>
          )}
          <span className="admin-user-info">
            {user?.email}
          </span>
          <button onClick={handleLogout} className="admin-logout-button">
            Logout
          </button>
        </div>
      </header>
      <div className="admin-container">
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            {/* Global navigation items */}
            {globalNavItems.map(item => (
              <Link
                key={item.id}
                to={item.resolvedPath}
                className={`admin-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}

            {/* Organization section - always shown if user has org memberships */}
            {orgMemberships.length > 0 && (
              <>
                <div className="admin-nav-divider" style={{
                  borderTop: '1px solid #444',
                  margin: '0.5rem 0',
                }} />
                
                {/* Organization Switcher */}
                <div style={{ padding: '0.5rem 1.5rem' }}>
                  <label
                    htmlFor="admin-org-selector"
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      color: '#888',
                      letterSpacing: '0.05em',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Organization
                  </label>
                  <select
                    id="admin-org-selector"
                    data-testid="admin-org-selector"
                    value={activeOrg?.id || ''}
                    onChange={handleOrgChange}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      backgroundColor: '#333',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    {orgMemberships.map((membership: MembershipWithOrganizationDto) => (
                      <option key={membership.organizationId} value={membership.organizationId}>
                        {membership.organizationName} ({membership.role === 'OrgAdmin' ? 'Admin' : 'Member'})
                      </option>
                    ))}
                  </select>
                  {/* Role badge for active org */}
                  {activeOrg && (
                    <span
                      data-testid="active-org-role-badge"
                      style={{
                        display: 'inline-block',
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: activeOrgIsAdmin ? '#007bff' : '#6c757d',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                      }}
                    >
                      {activeOrgIsAdmin ? 'Org Admin' : 'Member'}
                    </span>
                  )}
                </div>

                {/* Org-scoped navigation items - only shown when user is OrgAdmin for the active org */}
                {activeOrgIsAdmin && orgNavItems.length > 0 && (
                  <>
                    <div style={{
                      borderTop: '1px solid #444',
                      margin: '0.5rem 1.5rem',
                    }} />
                    {orgNavItems.map(item => (
                      <Link
                        key={item.id}
                        to={item.resolvedPath}
                        className={`admin-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
                        data-testid={`org-nav-${item.id}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </>
                )}

                {/* Message for member-only orgs */}
                {activeOrg && !activeOrgIsAdmin && (
                  <div style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.8rem',
                    color: '#888',
                  }}>
                    <p style={{ margin: 0 }}>You are a member of this organization.</p>
                    <Link
                      to={`/me/organizations/${activeOrg.id}`}
                      style={{
                        color: '#6ea8fe',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                      }}
                    >
                      View organization →
                    </Link>
                  </div>
                )}
              </>
            )}
          </nav>
          <div className="admin-sidebar-footer">
            <Link to={homeRoute} className="admin-back-link">
              ← Home
            </Link>
          </div>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

