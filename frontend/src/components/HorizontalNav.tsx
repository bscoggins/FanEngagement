import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getVisibleNavItems,
  getResolvedNavItem,
  type NavContext,
  type NavCategory,
  type NavItem,
} from '../navigation/navConfig';
import './HorizontalNav.css';

/**
 * Category display configuration
 */
const CATEGORY_ORDER: NavCategory[] = ['Platform', 'Management', 'Organization', 'Account'];

const CATEGORY_LABELS: Record<NavCategory, string> = {
  Platform: 'Platform',
  Management: 'Management',
  Organization: 'Organization',
  Account: 'Account',
};

interface ResolvedNavItem extends NavItem {
  resolvedPath: string;
}

interface CategoryGroup {
  category: NavCategory;
  label: string;
  items: ResolvedNavItem[];
}

interface HorizontalNavProps {
  navContext: NavContext;
  isNavItemActive: (path: string) => boolean;
  className?: string;
}

/**
 * Dropdown menu for a category with multiple items
 */
const CategoryDropdown: React.FC<{
  group: CategoryGroup;
  isNavItemActive: (path: string) => boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}> = ({ group, isNavItemActive, isOpen, onToggle, onClose }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check if any item in this category is active
  const hasActiveItem = group.items.some(item => isNavItemActive(item.resolvedPath));

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Handle Escape key to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle keyboard navigation within dropdown
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) return;

    const items = dropdownRef.current?.querySelectorAll<HTMLAnchorElement>('.horizontal-nav-dropdown-link');
    if (!items || items.length === 0) return;

    const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < items.length - 1) {
          items[currentIndex + 1].focus();
        } else {
          items[0].focus();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex > 0) {
          items[currentIndex - 1].focus();
        } else {
          items[items.length - 1].focus();
        }
        break;
      case 'Home':
        event.preventDefault();
        items[0].focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1].focus();
        break;
    }
  }, [isOpen]);

  return (
    <div 
      className="horizontal-nav-dropdown" 
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        className={`horizontal-nav-dropdown-trigger ${hasActiveItem ? 'active' : ''} ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid={`nav-dropdown-${group.category.toLowerCase()}`}
      >
        {group.label}
        <span className="horizontal-nav-dropdown-arrow" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      
      {isOpen && (
        <div 
          className="horizontal-nav-dropdown-menu"
          role="menu"
          aria-label={`${group.label} menu`}
        >
          {group.items.map(item => (
            <Link
              key={item.id}
              to={item.resolvedPath}
              className={`horizontal-nav-dropdown-link ${isNavItemActive(item.resolvedPath) ? 'active' : ''}`}
              onClick={onClose}
              role="menuitem"
              aria-current={isNavItemActive(item.resolvedPath) ? 'page' : undefined}
              data-testid={`nav-${item.id}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Single link for a category with only one item
 */
const SingleLink: React.FC<{
  item: ResolvedNavItem;
  isActive: boolean;
}> = ({ item, isActive }) => (
  <Link
    to={item.resolvedPath}
    className={`horizontal-nav-link ${isActive ? 'active' : ''}`}
    aria-current={isActive ? 'page' : undefined}
    data-testid={`nav-${item.id}`}
  >
    {item.label}
  </Link>
);

/**
 * HorizontalNav component for desktop navigation
 * Groups navigation items by category and displays them as dropdowns or single links
 */
export const HorizontalNav: React.FC<HorizontalNavProps> = ({
  navContext,
  isNavItemActive,
  className = '',
}) => {
  const [openDropdown, setOpenDropdown] = useState<NavCategory | null>(null);

  // Get all visible nav items (both user and global scoped)
  const allNavItems = useMemo(() => {
    // Check if user is an OrgAdmin of the active organization
    const isOrgAdminForActiveOrg = navContext.activeOrgId && navContext.activeOrgRole === 'OrgAdmin';
    
    // Get user-scoped items, filtering out generic My Account if admin versions exist
    const userItems = getVisibleNavItems(navContext, { scope: 'user' })
      .filter(item => {
        // Filter out generic 'myAccount' when platform/admin versions are available
        // Platform admins get 'platformMyAccount', OrgAdmins get 'adminMyAccount'
        // Only filter if user actually has access to admin My Account
        if (item.id === 'myAccount' && (navContext.isPlatformAdmin || isOrgAdminForActiveOrg)) {
          return false;
        }
        return true;
      })
      .map(item => getResolvedNavItem(item, navContext));
    
    // Get global-scoped items (admin)
    const globalItems = getVisibleNavItems(navContext, { scope: 'global' })
      .filter(item => {
        // Avoid duplicate My Account entries between platform and admin versions
        if (navContext.isPlatformAdmin) {
          return item.id !== 'adminMyAccount';
        }
        return item.id !== 'platformMyAccount';
      })
      .map(item => getResolvedNavItem(item, navContext));
    
    // Get org-scoped items
    const orgItems = getVisibleNavItems(navContext, { scope: 'org' })
      .map(item => getResolvedNavItem(item, navContext));
    
    return [...userItems, ...globalItems, ...orgItems];
  }, [navContext]);

  // Group items by category
  const categoryGroups = useMemo(() => {
    const grouped: Map<NavCategory, ResolvedNavItem[]> = new Map();
    
    allNavItems.forEach(item => {
      if (item.category) {
        const existing = grouped.get(item.category) || [];
        existing.push(item);
        grouped.set(item.category, existing);
      }
    });

    // Convert to ordered array of CategoryGroups
    const groups: CategoryGroup[] = [];
    CATEGORY_ORDER.forEach(category => {
      const items = grouped.get(category);
      if (items && items.length > 0) {
        groups.push({
          category,
          label: CATEGORY_LABELS[category],
          items: items.sort((a, b) => a.order - b.order),
        });
      }
    });

    return groups;
  }, [allNavItems]);

  // Close dropdown when clicking a link or pressing escape
  const handleCloseDropdown = useCallback(() => {
    setOpenDropdown(null);
  }, []);

  // Toggle a specific dropdown
  const handleToggleDropdown = useCallback((category: NavCategory) => {
    setOpenDropdown(prev => prev === category ? null : category);
  }, []);

  // Close dropdowns when route changes (detected by navContext changes)
  useEffect(() => {
    setOpenDropdown(null);
  }, [navContext.activeOrgId]);

  if (categoryGroups.length === 0) {
    return null;
  }

  return (
    <nav 
      className={`horizontal-nav ${className}`.trim()}
      aria-label="Main navigation"
      data-testid="horizontal-nav"
    >
      {categoryGroups.map(group => {
        if (group.items.length === 1) {
          // Single item - render as direct link
          const item = group.items[0];
          return (
            <SingleLink
              key={group.category}
              item={item}
              isActive={isNavItemActive(item.resolvedPath)}
            />
          );
        }
        
        // Multiple items - render as dropdown
        return (
          <CategoryDropdown
            key={group.category}
            group={group}
            isNavItemActive={isNavItemActive}
            isOpen={openDropdown === group.category}
            onToggle={() => handleToggleDropdown(group.category)}
            onClose={handleCloseDropdown}
          />
        );
      })}
    </nav>
  );
};
