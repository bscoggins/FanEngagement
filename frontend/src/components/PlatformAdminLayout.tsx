import React, { useEffect, useMemo } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveOrganization } from '../contexts/OrgContext';
import { getDefaultHomeRoute, getVisibleNavItems, getResolvedNavItem, type NavContext } from '../navigation';
import './PlatformAdminLayout.css';

export const PlatformAdminLayout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const { memberships } = usePermissions();
  const { activeOrg } = useActiveOrganization();
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

  // Get visible org-scoped nav items (when org is selected)
  const orgNavItems = useMemo(() => {
    const items = getVisibleNavItems(navContext, { scope: 'org' });
    return items.map(item => getResolvedNavItem(item, navContext));
  }, [navContext]);

  // Get the appropriate home route
  const homeRoute = useMemo(() => {
    return getDefaultHomeRoute(navContext);
  }, [navContext]);

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

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <h1>FanEngagement Platform Admin</h1>
        <div className="admin-header-right">
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

            {/* Org-scoped navigation items */}
            {orgNavItems.length > 0 && (
              <>
                <div className="admin-nav-divider" style={{
                  borderTop: '1px solid #444',
                  margin: '0.5rem 0',
                }} />
                <div className="admin-nav-section-label" style={{
                  padding: '0.5rem 1.5rem',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: '#888',
                  letterSpacing: '0.05em',
                }}>
                  {activeOrg?.name || 'Organization'}
                </div>
                {orgNavItems.map(item => (
                  <Link
                    key={item.id}
                    to={item.resolvedPath}
                    className={`admin-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ))}
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

