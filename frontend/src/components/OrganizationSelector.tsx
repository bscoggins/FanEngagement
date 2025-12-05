import React, { useRef, useState, useEffect } from 'react';
import { useActiveOrganization } from '../contexts/OrgContext';
import type { MembershipWithOrganizationDto } from '../types/api';
import './OrganizationSelector.css';

export const OrganizationSelector: React.FC = () => {
  const { activeOrg, setActiveOrg, memberships, hasMultipleOrgs } = useActiveOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const announcementTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  // Don't show selector if user doesn't have multiple orgs
  if (!hasMultipleOrgs) {
    return null;
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current !== null) {
        window.clearTimeout(announcementTimeoutRef.current);
      }
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orgId = e.target.value;
    const membership = memberships.find(m => m.organizationId === orgId);
    if (membership) {
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
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      e.currentTarget.blur();
    }
  };

  const handleBlur = () => {
    // Clear previous timeout if any
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div className="org-selector-container" ref={dropdownRef}>
      <label
        htmlFor="org-selector"
        className="org-selector-label"
      >
        Organization:
      </label>
      <select
        id="org-selector"
        value={activeOrg?.id || ''}
        onChange={handleOrgChange}
        onKeyDown={handleKeyDown}
        className="org-selector-select"
        aria-label="Select organization"
        aria-expanded={isOpen}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
      >
        {memberships.map((membership: MembershipWithOrganizationDto) => (
          <option key={membership.organizationId} value={membership.organizationId}>
            {membership.organizationName} ({membership.role === 'OrgAdmin' ? 'Admin' : 'Member'})
          </option>
        ))}
      </select>
      {activeOrg && (
        <span
          className={`org-selector-badge ${activeOrg.role === 'OrgAdmin' ? 'admin' : 'member'}`}
          aria-label={`Current role: ${activeOrg.role === 'OrgAdmin' ? 'Organization Admin' : 'Member'}`}
        >
          {activeOrg.role === 'OrgAdmin' ? 'Org Admin' : 'Member'}
        </span>
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
