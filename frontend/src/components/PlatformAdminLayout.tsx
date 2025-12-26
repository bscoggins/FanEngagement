import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveOrganization } from '../contexts/OrgContext';
import { getVisibleNavItems, getResolvedNavItem, type NavContext } from '../navigation';
import { SkipLink } from './SkipLink';
import { MobileNav, type MobileNavItem } from './MobileNav';
import { GlobalSearch } from './GlobalSearch';
import { RecentsDropdown } from './RecentsDropdown';
import { KeyboardShortcutOverlay } from './KeyboardShortcutOverlay';
import { Tooltip } from './Tooltip';
import { isMacPlatform } from '../utils/platformUtils';
import { PageTransition } from './PageTransition';
import { type ResponsiveDisplayStyles } from '../types/styles';
import './PlatformAdminLayout.css';
import '../pages/AdminPage.css';

const mobileMenuDisplay: ResponsiveDisplayStyles = { '--responsive-display': 'inline-flex' };

export const PlatformAdminLayout: React.FC = () => {
  const { logout, isAdmin } = useAuth();
  const { memberships } = usePermissions();
  const { activeOrg } = useActiveOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isShortcutOverlayOpen, setIsShortcutOverlayOpen] = useState(false);
  const mobileMenuLabel = 'Open navigation menu';
  const searchInputRef = useRef<HTMLDivElement>(null);

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
    const items = getVisibleNavItems(navContext, { scope: 'global' })
      // Avoid duplicating My Account; platform admins should see the platform-scoped entry here
      .filter(item => item.id !== 'adminMyAccount');
    return items.map(item => getResolvedNavItem(item, navContext));
  }, [navContext]);

  // Get visible org-scoped nav items (when org is selected)
  const orgNavItems = useMemo(() => {
    const items = getVisibleNavItems(navContext, { scope: 'org' });
    return items.map(item => getResolvedNavItem(item, navContext));
  }, [navContext]);

  // Keyboard shortcuts: ? for help overlay, Ctrl/Cmd+K for search focus
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      // Open keyboard shortcuts overlay with ?
      // Note: On most keyboards, ? requires Shift+/, so we check for the ? character itself
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        setIsShortcutOverlayOpen(true);
        return;
      }

      // Focus search with Ctrl+K or Cmd+K
      const isMac = isMacPlatform();
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;
      if (modifierKey && e.key === 'k' && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        const input = searchInputRef.current?.querySelector('input');
        if (input) {
          input.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => document.removeEventListener('keydown', handleKeyboardShortcut);
  }, []);

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

  // Prepare mobile nav items
  const mobileNavItems: MobileNavItem[] = useMemo(() => {
    return globalNavItems.map(item => ({
      id: item.id,
      label: item.label,
      path: item.resolvedPath,
      isActive: isNavItemActive(item.resolvedPath),
    }));
  }, [globalNavItems, isNavItemActive]);

  const mobileNavSections = useMemo(() => {
    if (orgNavItems.length === 0) {
      return undefined;
    }

    return [{
      label: activeOrg?.name || 'Organization',
      items: orgNavItems.map(item => ({
        id: item.id,
        label: item.label,
        path: item.resolvedPath,
        isActive: isNavItemActive(item.resolvedPath),
      })),
    }];
  }, [orgNavItems, activeOrg?.name, isNavItemActive]);

  return (
    <>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      
      {/* Keyboard Shortcut Overlay */}
      <KeyboardShortcutOverlay
        isOpen={isShortcutOverlayOpen}
        onClose={() => setIsShortcutOverlayOpen(false)}
      />
      
      <div className="admin-layout">
        <header className="admin-header" role="banner">
          <div className="admin-header-left">
            <Tooltip content={mobileMenuLabel} placement="bottom">
              <button
                className="admin-mobile-menu-button show-md-down"
                style={mobileMenuDisplay}
                onClick={() => setIsMobileNavOpen(true)}
                aria-label={mobileMenuLabel}
                aria-expanded={isMobileNavOpen}
                aria-controls="mobile-nav-drawer"
              >
                <span className="hamburger-icon" aria-hidden="true">☰</span>
              </button>
            </Tooltip>
            <h1>FanEngagement Platform Admin</h1>
          </div>
          <div className="admin-header-center">
            <div ref={searchInputRef}>
              <GlobalSearch />
            </div>
          </div>
          <div className="admin-header-right">
            <RecentsDropdown />
            <span className="admin-badge">
              Platform Admin
            </span>
            <button 
              onClick={handleLogout} 
              className="admin-logout-button"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        </header>
        
        <div className="admin-container stack-md">
          <aside className="admin-sidebar hide-md-down" role="navigation" aria-label="Platform admin navigation">
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

              {/* Org-scoped navigation items */}
              {orgNavItems.length > 0 && (
                <>
                  <div className="admin-nav-divider" role="separator" />
                  <div className="admin-nav-section-label">
                    {activeOrg?.name || 'Organization'}
                  </div>
                  {orgNavItems.map(item => (
                    <Link
                      key={item.id}
                      to={item.resolvedPath}
                      className={`admin-nav-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
                      aria-current={isNavItemActive(item.resolvedPath) ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </aside>
          <main className="admin-main" id="main-content" role="main" tabIndex={-1}>
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
        />
      </div>
    </>
  );
};
