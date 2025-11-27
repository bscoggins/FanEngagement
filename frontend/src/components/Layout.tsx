import React, { useEffect, useMemo, useCallback } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveOrganization } from '../contexts/OrgContext';
import { getDefaultHomeRoute, getVisibleNavItems, getResolvedNavItem, type NavContext } from '../navigation';
import './Layout.css';

export const Layout: React.FC = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { isGlobalAdmin, memberships, canAccessAdminArea } = usePermissions();
  const { activeOrg, setActiveOrg, memberships: orgMemberships } = useActiveOrganization();
  const navigate = useNavigate();
  const location = useLocation();

  // Build navigation context
  const navContext: NavContext = useMemo(() => ({
    isAuthenticated,
    isPlatformAdmin: isAdmin,
    activeOrgId: activeOrg?.id,
    activeOrgRole: activeOrg?.role,
    memberships,
  }), [isAuthenticated, isAdmin, activeOrg?.id, activeOrg?.role, memberships]);

  // Get visible user-scoped nav items
  const userNavItems = useMemo(() => {
    const items = getVisibleNavItems(navContext, { scope: 'user' });
    return items.map(item => getResolvedNavItem(item, navContext));
  }, [navContext]);

  // Get visible global-scoped nav items (for admin links)
  const globalNavItems = useMemo(() => {
    const items = getVisibleNavItems(navContext, { scope: 'global' });
    return items.map(item => getResolvedNavItem(item, navContext));
  }, [navContext]);

  // Get org-scoped nav items (for members viewing org)
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

      // Navigate to the member organization page
      navigate(`/me/organizations/${membership.organizationId}`);
    }
  }, [orgMemberships, setActiveOrg, navigate]);

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

  // For unauthenticated users, show simplified layout
  if (!isAuthenticated) {
    return (
      <div className="layout">
        <header className="header">
          <h1>FanEngagement</h1>
          <nav className="nav">
            <Link to="/login">Login</Link>
          </nav>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    );
  }

  // Check if active org has admin role
  const activeOrgIsAdmin = activeOrg && isOrgAdminForOrg(activeOrg.id);

  return (
    <div className="unified-layout">
      <header className="unified-header">
        <Link to={homeRoute} className="unified-header-title">
          <h1>FanEngagement</h1>
        </Link>
        <div className="unified-header-right">
          {isGlobalAdmin() && (
            <span className="unified-admin-badge" data-testid="platform-admin-badge">
              Platform Admin
            </span>
          )}
          <span className="unified-user-info" data-testid="user-email">
            {user?.email}
          </span>
          <button onClick={handleLogout} className="unified-logout-button" data-testid="logout-button">
            Logout
          </button>
        </div>
      </header>
      <div className="unified-container">
        <aside className="unified-sidebar" data-testid="unified-sidebar">
          <nav className="unified-nav">
            {/* User navigation items */}
            {userNavItems.map(item => (
              <Link
                key={item.id}
                to={item.resolvedPath}
                className={`unified-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
                data-testid={`nav-${item.id}`}
              >
                {item.label}
              </Link>
            ))}

            {/* Organization selector section - for members */}
            {orgMemberships.length > 0 && (
              <>
                <div className="unified-nav-divider" />
                
                {/* Organization Switcher */}
                <div className="unified-org-selector">
                  <label
                    htmlFor="unified-org-selector"
                    className="unified-org-selector-label"
                  >
                    Organization
                  </label>
                  <select
                    id="unified-org-selector"
                    data-testid="unified-org-selector"
                    value={activeOrg?.id || ''}
                    onChange={handleOrgChange}
                    className="unified-org-select"
                  >
                    {orgMemberships.map((membership) => (
                      <option key={membership.organizationId} value={membership.organizationId}>
                        {membership.organizationName} ({membership.role === 'OrgAdmin' ? 'Admin' : 'Member'})
                      </option>
                    ))}
                  </select>
                  {/* Role badge for active org */}
                  {activeOrg && (
                    <span
                      data-testid="active-org-role-badge"
                      className={`unified-role-badge ${activeOrgIsAdmin ? 'admin' : 'member'}`}
                    >
                      {activeOrgIsAdmin ? 'Org Admin' : 'Member'}
                    </span>
                  )}
                </div>

                {/* Org-scoped navigation items - only shown when user is OrgAdmin for the active org */}
                {activeOrgIsAdmin && orgNavItems.length > 0 && (
                  <>
                    <div className="unified-nav-divider-small" />
                    {orgNavItems.map(item => (
                      <Link
                        key={item.id}
                        to={item.resolvedPath}
                        className={`unified-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
                        data-testid={`org-nav-${item.id}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </>
                )}

                {/* Quick link to member org view when not admin */}
                {activeOrg && !activeOrgIsAdmin && (
                  <div className="unified-member-info">
                    <p>You are a member of this organization.</p>
                    <Link
                      to={`/me/organizations/${activeOrg.id}`}
                      className="unified-member-link"
                    >
                      View organization →
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Admin links section */}
            {canAccessAdminArea() && (
              <>
                <div className="unified-nav-divider" />
                <div className="unified-nav-section-label">Administration</div>
                {globalNavItems.map(item => (
                  <Link
                    key={item.id}
                    to={item.resolvedPath}
                    className={`unified-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
                    data-testid={`admin-nav-${item.id}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>
        </aside>
        <main className="unified-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
