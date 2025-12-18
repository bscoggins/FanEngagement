import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useMobileOrgSwitcher } from '../hooks/useMobileOrgSwitcher';
import { useActiveOrganization } from '../contexts/OrgContext';
import { getVisibleNavItems, getResolvedNavItem, type NavContext } from '../navigation';
import { SkipLink } from './SkipLink';
import { MobileNav, type MobileNavItem } from './MobileNav';
import { OrganizationDropdown } from './OrganizationDropdown';
import { Tooltip } from './Tooltip';
import './AdminLayout.css';
import '../pages/AdminPage.css';

export const AdminLayout: React.FC = () => {
  const { logout, isAdmin } = useAuth();
  const { isGlobalAdmin, memberships } = usePermissions();
  const { activeOrg, setActiveOrg, memberships: orgMemberships } = useActiveOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileMenuLabel = isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu';
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const keyboardHelpTimeoutRef = useRef<number | undefined>(undefined);

  // Platform detection for keyboard shortcuts
  const isMac = useMemo(() => {
    // Prefer userAgentData if available, then platform, then userAgent as fallback
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    if (nav.userAgentData?.platform) {
      return nav.userAgentData.platform.toUpperCase().includes('MAC');
    }
    if (navigator.platform) {
      return navigator.platform.toUpperCase().includes('MAC');
    }
    // Fallback to userAgent regex for Mac/iOS devices
    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  }, []);
  const modifierKeyName = isMac ? 'Cmd' : 'Ctrl';

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
    // Platform admins: show platform-scoped My Account; OrgAdmins: show admin-scoped My Account
    const items = getVisibleNavItems(navContext, { scope: 'global' })
      .filter(item => {
        if (navContext.isPlatformAdmin) {
          return item.id !== 'adminMyAccount';
        }
        return item.id !== 'platformMyAccount';
      });
    return items.map(item => getResolvedNavItem(item, navContext));
  }, [navContext]);

  // Get visible org-scoped nav items (when org is selected and user has OrgAdmin role for that org)
  const orgNavItems = useMemo(() => {
    const items = getVisibleNavItems(navContext, { scope: 'org' });
    return items.map(item => getResolvedNavItem(item, navContext));
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
  const activeOrgIsAdmin = !!(activeOrg && isOrgAdminForOrg(activeOrg.id));

  // Keyboard shortcuts for org admin navigation (Ctrl+1 through Ctrl+6)
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      // Only handle shortcuts when user has OrgAdmin role for active org
      if (!activeOrg || !activeOrgIsAdmin || orgNavItems.length === 0) {
        return;
      }

      // Check for modifier key + number keys 1-6
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modifierKey && !e.altKey && !e.shiftKey && e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key, 10) - 1;
        
        if (index < orgNavItems.length) {
          e.preventDefault();
          navigate(orgNavItems[index].resolvedPath);
          
          // Show brief keyboard help notification
          setShowKeyboardHelp(true);
          if (keyboardHelpTimeoutRef.current) {
            window.clearTimeout(keyboardHelpTimeoutRef.current);
          }
          keyboardHelpTimeoutRef.current = window.setTimeout(() => {
            setShowKeyboardHelp(false);
          }, 2000);
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcut);
      if (keyboardHelpTimeoutRef.current) {
        window.clearTimeout(keyboardHelpTimeoutRef.current);
      }
    };
  }, [activeOrg, activeOrgIsAdmin, orgNavItems, navigate, isMac]);

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

  // Use shared hook for mobile org switcher logic
  const { mobileOrganizations, handleMobileOrgChange } = useMobileOrgSwitcher({
    orgMemberships,
    isGlobalAdmin,
    setActiveOrg,
    isAdmin,
    navigate,
    setIsMobileNavOpen,
  });

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
            Use {modifierKeyName}+1–6 to navigate org admin pages
          </p>
        </div>
      )}
      
      <div className="admin-layout">
        <header className="admin-header" role="banner">
          <div className="admin-header-left">
            <Tooltip content={mobileMenuLabel} placement="bottom">
              <button
                className="admin-mobile-menu-button"
                onClick={() => setIsMobileNavOpen(prev => !prev)}
                aria-label={mobileMenuLabel}
                aria-expanded={isMobileNavOpen}
                aria-controls="mobile-nav-drawer"
              >
                <span className="hamburger-icon" aria-hidden="true">☰</span>
              </button>
            </Tooltip>
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
            {/* Organization dropdown - shown for any user with org memberships */}
            {orgMemberships.length > 0 && (
              <div className="admin-header-org-selector">
                <OrganizationDropdown
                  memberships={orgMemberships}
                  activeOrgId={activeOrg?.id}
                  onSelect={handleOrgSelect}
                  testId="admin-header-org-selector"
                />
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
                  data-testid={`admin-nav-${item.id}`}
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
                      aria-label={index < 6 ? `${item.label} (Shortcut ${modifierKeyName}+${index + 1})` : undefined}
                    >
                      <span className="admin-nav-link-text">{item.label}</span>
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
          </aside>
          <main className="admin-main" id="main-content" role="main" tabIndex={-1}>
            <Outlet />
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
