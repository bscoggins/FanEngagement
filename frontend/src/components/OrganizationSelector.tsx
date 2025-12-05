import React, { useRef, useState, useEffect } from 'react';
import { useActiveOrganization } from '../contexts/OrgContext';
import type { MembershipWithOrganizationDto } from '../types/api';
import './OrganizationSelector.css';

export const OrganizationSelector: React.FC = () => {
  const { activeOrg, setActiveOrg, memberships, hasMultipleOrgs } = useActiveOrganization();
  const [announcement, setAnnouncement] = useState('');
  const announcementTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current !== null) {
        window.clearTimeout(announcementTimeoutRef.current);
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

  // Don't show selector if user doesn't have multiple orgs
  if (!hasMultipleOrgs) {
    return null;
  }

  return (
    <div className="org-selector-container">
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
        className="org-selector-select"
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
