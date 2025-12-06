import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useActiveOrganization } from '../contexts/OrgContext';
import type { MembershipWithOrganizationDto } from '../types/api';
import './OrganizationSelector.css';

export const OrganizationSelector: React.FC = () => {
  const { activeOrg, setActiveOrg, memberships, hasMultipleOrgs } = useActiveOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  
  // Initialize focused index based on active org
  const [focusedIndex, setFocusedIndex] = useState(() => {
    if (activeOrg) {
      return memberships.findIndex(m => m.organizationId === activeOrg.id);
    }
    return -1;
  });
  
  const announcementTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current !== null) {
        window.clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

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
        } else {
          setFocusedIndex(prev => (prev + 1) % memberships.length);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
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
        buttonRef.current?.focus();
        break;
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (focusedIndex >= 0) {
          handleOrgSelect(memberships[focusedIndex]);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, focusedIndex, memberships, handleOrgSelect]);

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement && focusedElement.scrollIntoView) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
        className="org-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="org-selector-label org-selector-button"
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
            const isTruncated = membership.organizationName.length > 30;
            
            return (
              <li
                key={membership.organizationId}
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
