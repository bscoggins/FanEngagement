import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useMobileOrgSwitcher } from '../hooks/useMobileOrgSwitcher';
import { useActiveOrganization } from '../contexts/OrgContext';
import { getDefaultHomeRoute, getVisibleNavItems, getResolvedNavItem, type NavContext } from '../navigation';
import { SkipLink } from './SkipLink';
import { MobileNav, type MobileNavItem } from './MobileNav';
import { OrganizationDropdown } from './OrganizationDropdown';
import { PageTransition } from './PageTransition';
import './Layout.css';

export const Layout: React.FC = () => {
  const { isAuthenticated, logout, isAdmin } = useAuth();
  const { isGlobalAdmin, memberships, canAccessAdminArea } = usePermissions();
  const { activeOrg, setActiveOrg, memberships: orgMemberships } = useActiveOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileMenuLabel = 'Open navigation menu';

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
    const items = getVisibleNavItems(navContext, { scope: 'global' })
      .filter(item => {
        if (navContext.isPlatformAdmin) {
          return item.id !== 'adminMyAccount';
        }
        return item.id !== 'platformMyAccount';
      });
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
  const handleOrgSelect = useCallback((orgId: string) => {
    const membership = orgMemberships.find(m => m.organizationId === orgId);
    if (membership) {
      setActiveOrg({
        id: membership.organizationId,
        name: membership.organizationName,
        role: membership.role,
      });

      // Navigate based on role: OrgAdmin/platform admin → admin overview, else member view
      if (isAdmin || membership.role === 'OrgAdmin') {
        navigate(`/admin/organizations/${membership.organizationId}/edit`);
      } else {
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
  const isNavItemActive = useCallback((path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);

  // Check if active org has admin role
  const activeOrgIsAdmin = activeOrg && isOrgAdminForOrg(activeOrg.id);

  // Prepare mobile nav items
  const mobileNavItems: MobileNavItem[] = useMemo(() => {
    const items: MobileNavItem[] = [];
    
    // Add user items
    userNavItems.forEach(item => {
      items.push({
        id: item.id,
        label: item.label,
        path: item.resolvedPath,
        isActive: isNavItemActive(item.resolvedPath),
      });
    });

    return items;
  }, [userNavItems, isNavItemActive]);

  const mobileNavSections = useMemo(() => {
    if (!canAccessAdminArea() || (activeOrg && !activeOrgIsAdmin)) {
      return undefined;
    }

    return [{
      label: 'Administration',
      items: globalNavItems.map(item => ({
        id: item.id,
        label: item.label,
        path: item.resolvedPath,
        isActive: isNavItemActive(item.resolvedPath),
      })),
    }];
  }, [canAccessAdminArea, activeOrg, activeOrgIsAdmin, globalNavItems, isNavItemActive]);

  // Use shared hook for mobile org switcher logic
  const { mobileOrganizations, handleMobileOrgChange } = useMobileOrgSwitcher({
    orgMemberships,
    isGlobalAdmin,
    setActiveOrg,
    isAdmin,
    navigate,
    setIsMobileNavOpen,
  });

  // For unauthenticated users, show simplified layout
  if (!isAuthenticated) {
    return (
      <>
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <div className="layout">
          <header className="header" role="banner">
            <h1>FanEngagement</h1>
            <nav className="nav" role="navigation" aria-label="Main navigation">
              <Link to="/login">Login</Link>
            </nav>
          </header>
          <main className="main-content" role="main" id="main-content" tabIndex={-1}>
            <PageTransition transitionKey={location.key}>
              <Outlet />
            </PageTransition>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      
      <div className="unified-layout">
        <header className="unified-header" role="banner">
          <div className="unified-header-left">
            <button
              className="unified-mobile-menu-button"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label={mobileMenuLabel}
              aria-expanded={isMobileNavOpen}
              aria-controls="mobile-nav-drawer"
            >
              <span className="hamburger-icon" aria-hidden="true">☰</span>
            </button>
            <Link to={homeRoute} className="unified-header-title">
              <h1>FanEngagement</h1>
            </Link>
          </div>
          <div className="unified-header-right">
            {isGlobalAdmin() && (
              <span className="unified-admin-badge" data-testid="platform-admin-badge">
                Platform Admin
              </span>
            )}
            {/* Org Admin badge - shown when user is org admin for active org */}
            {!isGlobalAdmin() && activeOrgIsAdmin && (
              <span className="unified-admin-badge" data-testid="org-admin-badge">
                Org Admin
              </span>
            )}
            {/* Organization dropdown - only shown for non-platform admins */}
            {orgMemberships.length > 0 && (
              <OrganizationDropdown
                memberships={orgMemberships}
                activeOrgId={activeOrg?.id}
                onSelect={handleOrgSelect}
                testId="unified-header-org-selector"
              />
            )}
            <button 
              onClick={handleLogout} 
              className="unified-logout-button" 
              data-testid="logout-button"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </header>
        
        <div className="unified-container">
          <aside className="unified-sidebar" data-testid="unified-sidebar" role="navigation" aria-label="User navigation">
            <nav className="unified-nav">
              {/* User navigation items */}
              {userNavItems.map(item => (
                <Link
                  key={item.id}
                  to={item.resolvedPath}
                  className={`unified-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
                  data-testid={`nav-${item.id}`}
                  aria-current={isNavItemActive(item.resolvedPath) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}

              {/* Admin links section - only show when user can access admin area AND either no org is selected or user is admin of the selected org */}
              {canAccessAdminArea() && (!activeOrg || activeOrgIsAdmin) && (
                <>
                  <div className="unified-nav-divider" role="separator" />
                  <div className="unified-nav-section-label">
                    Administration
                  </div>
                  {globalNavItems.map(item => (
                    <Link
                      key={item.id}
                      to={item.resolvedPath}
                      className={`unified-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
                      data-testid={`admin-nav-${item.id}`}
                      aria-current={isNavItemActive(item.resolvedPath) ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </aside>
          <main className="unified-main" id="main-content" role="main" tabIndex={-1}>
            <PageTransition transitionKey={location.key}>
              <Outlet />
            </PageTransition>
          </main>
        </div>
        
        {/* Mobile navigation drawer */}
        <MobileNav
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          items={mobileNavItems}
          sections={mobileNavSections}
          organizations={mobileOrganizations}
          activeOrgId={activeOrg?.id}
          onOrgChange={handleMobileOrgChange}
        />
      </div>
    </>
  );
};
