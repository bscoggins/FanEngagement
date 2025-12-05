import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './MobileNav.css';

export interface MobileNavItem {
  id: string;
  label: string;
  path: string;
  isActive?: boolean;
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  items: MobileNavItem[];
  sections?: Array<{
    label: string;
    items: MobileNavItem[];
  }>;
}

/**
 * MobileNav component for mobile-friendly navigation
 * Slide-out drawer with touch-friendly tap targets
 */
export const MobileNav: React.FC<MobileNavProps> = ({ 
  isOpen, 
  onClose, 
  items,
  sections 
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Handle focus management when drawer opens/closes
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element to restore focus later
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      
      // Focus the close button when drawer opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    } else {
      // Restore focus to the element that opened the drawer
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    }
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

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="mobile-nav-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <nav 
        id="mobile-nav-drawer"
        className="mobile-nav-drawer"
        aria-label="Mobile navigation"
        role="navigation"
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
          {/* Main items */}
          {items.length > 0 && (
            <ul className="mobile-nav-list">
              {items.map(item => (
                <li key={item.id} className="mobile-nav-item">
                  <Link
                    to={item.path}
                    className={`mobile-nav-link ${item.isActive ? 'active' : ''}`}
                    onClick={onClose}
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
  );
};
