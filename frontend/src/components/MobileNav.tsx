import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRoleBadgeClass, getRoleLabel, type RoleType } from '../utils/roleUtils';
import './MobileNav.css';

const NAV_OPEN_STATUS = 'Navigation menu opened.';
const NAV_CLOSED_STATUS = 'Navigation menu closed.';
const FIRST_NAV_ITEM_SELECTOR = '.mobile-nav-org-list button, .mobile-nav-list a, .mobile-nav-list button';
const NAV_INTERACTION_DELAY_MS = 200;
const getNavInteractionDelayMs = (): number => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return NAV_INTERACTION_DELAY_MS;
  }

  try {
    const root = document.documentElement;
    const raw = window.getComputedStyle(root).getPropertyValue('--duration-slow').trim();
    if (!raw) return NAV_INTERACTION_DELAY_MS;

    if (raw.endsWith('ms')) {
      const value = parseFloat(raw.slice(0, -2));
      return Number.isFinite(value) ? value : NAV_INTERACTION_DELAY_MS;
    }

    if (raw.endsWith('s')) {
      const value = parseFloat(raw.slice(0, -1));
      return Number.isFinite(value) ? value * 1000 : NAV_INTERACTION_DELAY_MS;
    }

    const numericValue = parseFloat(raw);
    return Number.isFinite(numericValue) ? numericValue : NAV_INTERACTION_DELAY_MS;
  } catch {
    return NAV_INTERACTION_DELAY_MS;
  }
};
const scheduleNavDelay = (callback: () => void) => window.setTimeout(callback, getNavInteractionDelayMs());

export interface MobileNavItem {
  id: string;
  label: string;
  path: string;
  isActive?: boolean;
}

export interface MobileNavOrganization {
  id: string;
  name: string;
  role: RoleType;
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  items: MobileNavItem[];
  sections?: Array<{
    label: string;
    items: MobileNavItem[];
  }>;
  organizations?: MobileNavOrganization[];
  activeOrgId?: string;
  onOrgChange?: (orgId: string) => void;
}

/**
 * MobileNav component for mobile-friendly navigation
 * Slide-out drawer with touch-friendly tap targets
 */
export const MobileNav: React.FC<MobileNavProps> = ({ 
  isOpen, 
  onClose, 
  items,
  sections,
  organizations,
  activeOrgId,
  onOrgChange 
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  const statusTimeoutRef = useRef<number | null>(null);
  const previousIsOpen = useRef(isOpen);
  const [statusMessage, setStatusMessage] = useState('');

  // Handle focus management when drawer opens/closes
  useEffect(() => {
    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
    }

    if (isOpen) {
      // Store the currently focused element to restore focus later
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      statusTimeoutRef.current = scheduleNavDelay(() => {
        setStatusMessage(NAV_OPEN_STATUS);
      });
      
      focusTimeoutRef.current = scheduleNavDelay(() => {
        const drawer = drawerRef.current;
        const firstNavItem = drawer?.querySelector<HTMLElement>(FIRST_NAV_ITEM_SELECTOR);
        if (firstNavItem) {
          firstNavItem.focus();
          return;
        }
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
          return;
        }
      });
    } else {
      // Restore focus to the element that opened the drawer
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
      if (previousIsOpen.current) {
        statusTimeoutRef.current = scheduleNavDelay(() => {
          setStatusMessage(NAV_CLOSED_STATUS);
        });
      }
    }

    previousIsOpen.current = isOpen;

    return () => {
      if (focusTimeoutRef.current) {
        window.clearTimeout(focusTimeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        window.clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Manage body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Store original overflow value
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      // Restore on cleanup
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Focus trap: keep focus within the drawer
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      // Get all focusable elements within the drawer
      const focusableArray = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.getAttribute('aria-hidden') !== 'true');
      
      if (focusableArray.length === 0) return;

      const firstElement = focusableArray[0];
      const lastElement = focusableArray[focusableArray.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;
      const isFocusedInside = activeElement ? drawer.contains(activeElement) : false;

      if (!isFocusedInside) {
        e.preventDefault();
        (e.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      // Trap focus within drawer
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  return (
    <>
      {statusMessage && (
        <div
          className="visually-hidden"
          aria-live="polite"
          aria-atomic="true"
          role="status"
        >
          {statusMessage}
        </div>
      )}

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="mobile-nav-backdrop"
            onClick={onClose}
            aria-hidden="true"
          />
          
          {/* Drawer */}
          <nav 
            ref={drawerRef}
            id="mobile-nav-drawer"
            className="mobile-nav-drawer"
            aria-label="Mobile navigation"
          >
            <div className="mobile-nav-header">
              <h2 className="mobile-nav-title">Menu</h2>
              <button
                ref={closeButtonRef}
                className="mobile-nav-close"
                onClick={onClose}
                aria-label="Close navigation"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            
            <div className="mobile-nav-content">
              {/* Organization switcher - shown only when multiple orgs are available */}
              {organizations && organizations.length > 1 && (
                <div className="mobile-nav-org-section">
                  <div className="mobile-nav-org-label">
                    Organization
                  </div>
                  <div className="mobile-nav-org-list">
                    {organizations.map(org => {
                      const isActive = org.id === activeOrgId;
                      const roleLabel = getRoleLabel(org.role);
                      return (
                        <button
                          key={org.id}
                          className={`mobile-nav-org-button ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            if (onOrgChange) {
                              onOrgChange(org.id);
                            }
                          }}
                          aria-current={isActive ? 'true' : undefined}
                          aria-label={`Switch to ${org.name} (${roleLabel})`}
                          data-testid={`mobile-org-${org.id}`}
                        >
                          <span className="mobile-nav-org-name">
                            {org.name}
                          </span>
                          <span className={`mobile-nav-org-badge ${getRoleBadgeClass(org.role)}`}>
                            {roleLabel}
                          </span>
                          {isActive && (
                            <span className="mobile-nav-org-checkmark" aria-hidden="true">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Main items */}
              {items.length > 0 && (
                <ul className="mobile-nav-list">
                  {items.map(item => (
                    <li key={item.id} className="mobile-nav-item">
                      <Link
                        to={item.path}
                        className={`mobile-nav-link ${item.isActive ? 'active' : ''}`}
                        onClick={onClose}
                        aria-current={item.isActive ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              
              {/* Sectioned items */}
              {sections && sections.map((section, idx) => (
                <div key={idx} className="mobile-nav-section">
                  <div className="mobile-nav-section-label">
                    {section.label}
                  </div>
                  <ul className="mobile-nav-list">
                    {section.items.map(item => (
                      <li key={item.id} className="mobile-nav-item">
                        <Link
                          to={item.path}
                          className={`mobile-nav-link ${item.isActive ? 'active' : ''}`}
                          onClick={onClose}
                          aria-current={item.isActive ? 'page' : undefined}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </>
      )}
    </>
  );
};
