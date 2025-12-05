import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveOrganization } from '../contexts/OrgContext';
import { getDefaultHomeRoute, getVisibleNavItems, getResolvedNavItem, type NavContext } from '../navigation';
import { SkipLink } from './SkipLink';
import { MobileNav, type MobileNavItem } from './MobileNav';
import './AdminLayout.css';

export const AdminLayout: React.FC = () => {
  const { logout, isAdmin } = useAuth();
  const { isGlobalAdmin, memberships } = usePermissions();
  const { activeOrg, setActiveOrg, memberships: orgMemberships } = useActiveOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
        // Navigate to member dashboard (home page) for this org
        navigate(`/me/home`);
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

  // Prepare mobile nav items
  const mobileNavItems: MobileNavItem[] = useMemo(() => {
    const items: MobileNavItem[] = [];
    
    // Add global items
    globalNavItems.forEach(item => {
      items.push({
        id: item.id,
        label: item.label,
        path: item.resolvedPath,
        isActive: isNavItemActive(item.resolvedPath),
      });
    });

    return items;
  }, [globalNavItems, location.pathname]);

  const mobileNavSections = useMemo(() => {
    if (!activeOrg || !activeOrgIsAdmin || orgNavItems.length === 0) {
      return undefined;
    }

    return [{
      label: 'Administration',
      items: orgNavItems.map(item => ({
        id: item.id,
        label: item.label,
        path: item.resolvedPath,
        isActive: isNavItemActive(item.resolvedPath),
      })),
    }];
  }, [activeOrg, activeOrgIsAdmin, orgNavItems, location.pathname]);

  return (
    <>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      
      <div className="admin-layout">
        <header className="admin-header" role="banner">
          <div className="admin-header-left">
            <button
              className="admin-mobile-menu-button"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isMobileNavOpen}
            >
              <span className="hamburger-icon" aria-hidden="true">☰</span>
            </button>
            <h1>FanEngagement Admin</h1>
          </div>
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
            <button 
              onClick={handleLogout} 
              className="admin-logout-button"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </header>
        
        <div className="admin-container">
          <aside className="admin-sidebar" role="navigation" aria-label="Admin navigation">
            <nav className="admin-nav">
              {/* Global navigation items */}
              {globalNavItems.map(item => (
                <Link
                  key={item.id}
                  to={item.resolvedPath}
                  className={`admin-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
                  aria-current={isNavItemActive(item.resolvedPath) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}

              {/* Organization section - show when user is OrgAdmin for active org */}
              {activeOrg && activeOrgIsAdmin && orgNavItems.length > 0 && (
                <>
                  <div className="admin-nav-divider" role="separator" />
                  <div className="admin-nav-section-label">
                    Administration
                  </div>
                  {orgNavItems.map(item => (
                    <Link
                      key={item.id}
                      to={item.resolvedPath}
                      className={`admin-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
                      data-testid={`org-nav-${item.id}`}
                      aria-current={isNavItemActive(item.resolvedPath) ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  ))}
                </>
              )}

              {/* Message for member-only orgs */}
              {activeOrg && !activeOrgIsAdmin && (
                <div className="admin-member-info" role="status">
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
              <Link to={homeRoute} className="admin-back-link" aria-label="Go to home page">
                ← Home
              </Link>
            </div>
          </aside>
          <main className="admin-main" id="main-content" role="main">
            <Outlet />
          </main>
        </div>
        
        {/* Mobile navigation drawer */}
        <MobileNav
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          items={mobileNavItems}
          sections={mobileNavSections}
        />
      </div>
    </>
  );
};


