import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useActiveOrganization } from '../contexts/OrgContext';
import type { MembershipWithOrganizationDto } from '../types/api';
import './OrganizationSelector.css';

const TRUNCATE_THRESHOLD = 30;

export const OrganizationSelector: React.FC = () => {
  const { activeOrg, setActiveOrg, memberships, hasMultipleOrgs } = useActiveOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  
  // Compute the initial focused index based on active org
  const initialFocusedIndex = useMemo(() => {
    if (activeOrg && memberships.length > 0) {
      return memberships.findIndex(m => m.organizationId === activeOrg.id);
    }
    return -1;
  }, [activeOrg, memberships]);
  
  const [focusedIndex, setFocusedIndex] = useState(initialFocusedIndex);
  
  const announcementTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const escapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current !== null) {
        window.clearTimeout(announcementTimeoutRef.current);
      }
      if (escapeTimeoutRef.current !== null) {
        clearTimeout(escapeTimeoutRef.current);
      }
    };
  }, []);

  // Update focused index when initial value changes (e.g., when active org or memberships change)
  useEffect(() => {
    setFocusedIndex(initialFocusedIndex);
  }, [initialFocusedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(initialFocusedIndex);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, initialFocusedIndex]);

  const handleOrgSelect = useCallback((membership: MembershipWithOrganizationDto) => {
    setActiveOrg({
      id: membership.organizationId,
      name: membership.organizationName,
      role: membership.role,
    });
    
    // Announce change for screen readers
    const roleText = membership.role === 'OrgAdmin' ? 'Admin' : 'Member';
    setAnnouncement(`Switched to ${membership.organizationName} as ${roleText}`);
    
    // Clear previous timeout if any
    if (announcementTimeoutRef.current !== null) {
      window.clearTimeout(announcementTimeoutRef.current);
    }
    announcementTimeoutRef.current = window.setTimeout(() => setAnnouncement(''), 1000);
    
    setIsOpen(false);
    buttonRef.current?.focus();
  }, [setActiveOrg]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(initialFocusedIndex >= 0 ? initialFocusedIndex : 0);
        } else {
          setFocusedIndex(prev => (prev + 1) % memberships.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(initialFocusedIndex >= 0 ? initialFocusedIndex : memberships.length - 1);
        } else {
          setFocusedIndex(prev => (prev - 1 + memberships.length) % memberships.length);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          handleOrgSelect(memberships[focusedIndex]);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        // Use setTimeout to ensure DOM is stable before focusing
        escapeTimeoutRef.current = setTimeout(() => {
          buttonRef.current?.focus();
        }, 0);
        break;
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (focusedIndex >= 0) {
          handleOrgSelect(memberships[focusedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, focusedIndex, memberships, handleOrgSelect, initialFocusedIndex]);

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement && focusedElement.scrollIntoView) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    }
  }, [focusedIndex, isOpen]);

  // Don't show selector if user doesn't have multiple orgs
  if (!hasMultipleOrgs) {
    return null;
  }

  const getRoleBadgeClass = (role: string) => role === 'OrgAdmin' ? 'admin' : 'member';
  const getRoleLabel = (role: string) => role === 'OrgAdmin' ? 'Admin' : 'Member';

  return (
    <div className="org-selector-container" ref={dropdownRef}>
      <span className="org-selector-label" id="org-selector-label">
        Organization:
      </span>
      <button
        ref={buttonRef}
        type="button"
        className="org-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="org-selector-label org-selector-button"
        aria-activedescendant={isOpen && focusedIndex >= 0 ? `org-option-${memberships[focusedIndex].organizationId}` : undefined}
        id="org-selector-button"
        data-testid="org-selector-button"
      >
        <span className="org-selector-button-text">
          {activeOrg?.name || 'Select organization'}
        </span>
        <span
          className={`org-selector-button-badge ${activeOrg ? getRoleBadgeClass(activeOrg.role) : ''}`}
          aria-label={activeOrg ? `Role: ${getRoleLabel(activeOrg.role)}` : ''}
        >
          {activeOrg && getRoleLabel(activeOrg.role)}
        </span>
        <span className="org-selector-button-arrow" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      
      {isOpen && (
        <ul
          ref={listRef}
          className="org-selector-dropdown"
          role="listbox"
          aria-labelledby="org-selector-label"
          data-testid="org-selector-dropdown"
        >
          {memberships.map((membership: MembershipWithOrganizationDto, index: number) => {
            const isActive = activeOrg?.id === membership.organizationId;
            const isFocused = index === focusedIndex;
            const isTruncated = membership.organizationName.length > TRUNCATE_THRESHOLD;
            
            return (
              <li
                key={membership.organizationId}
                id={`org-option-${membership.organizationId}`}
                className={`org-selector-option ${isActive ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
                role="option"
                aria-selected={isActive}
                onClick={() => handleOrgSelect(membership)}
                onMouseEnter={() => {
                  setFocusedIndex(index);
                  if (isTruncated) {
                    setShowTooltip(membership.organizationId);
                  }
                }}
                onMouseLeave={() => setShowTooltip(null)}
                data-testid={`org-option-${membership.organizationId}`}
              >
                <span className="org-selector-option-name">
                  {membership.organizationName}
                </span>
                <span
                  className={`org-selector-option-badge ${getRoleBadgeClass(membership.role)}`}
                >
                  {getRoleLabel(membership.role)}
                </span>
                {isActive && (
                  <span className="org-selector-option-checkmark" aria-hidden="true">
                    ✓
                  </span>
                )}
                {isTruncated && showTooltip === membership.organizationId && (
                  <span className="org-selector-tooltip" role="tooltip">
                    {membership.organizationName}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      
      {/* Screen reader announcement for org switching */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="org-selector-announcement"
      >
        {announcement}
      </div>
    </div>
  );
};
