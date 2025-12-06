import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
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
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const keyboardHelpTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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
  const isNavItemActive = useCallback((path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);

  // Check if active org has admin role
  const activeOrgIsAdmin = activeOrg && isOrgAdminForOrg(activeOrg.id);

  // Keyboard shortcuts for org admin navigation (Ctrl+1 through Ctrl+6)
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      // Only handle shortcuts when user has OrgAdmin role for active org
      if (!activeOrg || !activeOrgIsAdmin || orgNavItems.length === 0) {
        return;
      }

      // Check for Ctrl key (Cmd on Mac) + number keys 1-6
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifierKey && e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key, 10) - 1;
        
        if (index < orgNavItems.length) {
          e.preventDefault();
          navigate(orgNavItems[index].resolvedPath);
          
          // Show brief keyboard help notification
          setShowKeyboardHelp(true);
          if (keyboardHelpTimeoutRef.current) {
            clearTimeout(keyboardHelpTimeoutRef.current);
          }
          keyboardHelpTimeoutRef.current = setTimeout(() => {
            setShowKeyboardHelp(false);
          }, 2000);
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcut);
      if (keyboardHelpTimeoutRef.current) {
        clearTimeout(keyboardHelpTimeoutRef.current);
      }
    };
  }, [activeOrg, activeOrgIsAdmin, orgNavItems, navigate]);

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
  }, [globalNavItems, isNavItemActive]);

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
  }, [activeOrg, activeOrgIsAdmin, orgNavItems, isNavItemActive]);

  return (
    <>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      
      {/* Keyboard shortcut help notification */}
      {showKeyboardHelp && activeOrg && activeOrgIsAdmin && (
        <div 
          className="keyboard-help-toast" 
          role="status" 
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="keyboard-help-title">Keyboard Shortcuts</p>
          <p className="keyboard-help-hint">
            Use {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl'}+1–6 to navigate org admin pages
          </p>
        </div>
      )}
      
      <div className="admin-layout">
        <header className="admin-header" role="banner">
          <div className="admin-header-left">
            <button
              className="admin-mobile-menu-button"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isMobileNavOpen}
              aria-controls="mobile-nav-drawer"
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
                  {orgNavItems.map((item, index) => (
                    <Link
                      key={item.id}
                      to={item.resolvedPath}
                      className={`admin-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
                      data-testid={`org-nav-${item.id}`}
                      aria-current={isNavItemActive(item.resolvedPath) ? 'page' : undefined}
                    >
                      <span className="admin-nav-link-text">{item.label}</span>
                      {index < 6 && (
                        <span className="admin-nav-shortcut" aria-label={`Keyboard shortcut: ${navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? 'Cmd' : 'Ctrl'}+${index + 1}`}>
                          {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'}{index + 1}
                        </span>
                      )}
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


