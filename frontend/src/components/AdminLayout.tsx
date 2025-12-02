import React, { useEffect, useMemo, useCallback } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveOrganization } from '../contexts/OrgContext';
import { getDefaultHomeRoute, getVisibleNavItems, getResolvedNavItem, type NavContext } from '../navigation';
import './AdminLayout.css';

export const AdminLayout: React.FC = () => {
  const { logout, isAdmin } = useAuth();
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
      // Use direct membership role check since we already have the membership object
      if (isAdmin || membership.role === 'OrgAdmin') {
        // Navigate to org admin overview
        navigate(`/admin/organizations/${membership.organizationId}/edit`);
      } else {
        // Navigate to member view for this org
        navigate(`/me/organizations/${membership.organizationId}`);
      }
    }
  }, [orgMemberships, setActiveOrg, isAdmin, navigate]);

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
            <span className="admin-badge">
              Platform Admin
            </span>
          )}
          {/* Org Admin badge - shown when user is org admin for active org */}
          {!isGlobalAdmin() && activeOrgIsAdmin && (
            <span className="admin-badge" data-testid="org-admin-badge">
              Org Admin
            </span>
          )}
          {/* Organization dropdown - only shown for non-platform admins */}
          {!isGlobalAdmin() && orgMemberships.length > 0 && (
            <div className="admin-header-org-selector">
              <label
                htmlFor="admin-header-org-selector"
                className="admin-header-org-selector-label"
              >
                Organization:
              </label>
              <select
                id="admin-header-org-selector"
                data-testid="admin-header-org-selector"
                value={activeOrg?.id || ''}
                onChange={handleOrgChange}
                className="admin-header-org-select"
              >
                {orgMemberships.map((membership) => (
                  <option key={membership.organizationId} value={membership.organizationId}>
                    {membership.organizationName}
                  </option>
                ))}
              </select>
            </div>
          )}
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

            {/* Organization section - show when user is OrgAdmin for active org */}
            {activeOrg && activeOrgIsAdmin && orgNavItems.length > 0 && (
              <>
                <div className="admin-nav-divider" />
                <div className="admin-nav-section-label">Administration</div>
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
              <div className="admin-member-info">
                <p>You are a member of this organization.</p>
                <Link
                  to={`/me/organizations/${activeOrg.id}`}
                  className="admin-member-link"
                >
                  View organization →
                </Link>
              </div>
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

