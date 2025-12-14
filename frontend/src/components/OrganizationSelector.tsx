import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown, type DropdownItem } from './Dropdown';
import { useActiveOrganization } from '../contexts/OrgContext';
import { getRoleBadgeClass, getRoleLabel } from '../utils/roleUtils';
import type { MembershipWithOrganizationDto } from '../types/api';
import './OrganizationSelector.css';

const TRUNCATE_THRESHOLD = 30;

export const OrganizationSelector: React.FC = () => {
  const { activeOrg, setActiveOrg, memberships, hasMultipleOrgs } = useActiveOrganization();
  const [announcement, setAnnouncement] = useState('');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const announcementTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const handleOrgSelect = useCallback((membership: MembershipWithOrganizationDto) => {
    setActiveOrg({
      id: membership.organizationId,
      name: membership.organizationName,
      role: membership.role,
    });

    const roleText = membership.role === 'OrgAdmin' ? 'Admin' : 'Member';
    setAnnouncement(`Switched to ${membership.organizationName} as ${roleText}`);

    if (announcementTimeoutRef.current !== null) {
      window.clearTimeout(announcementTimeoutRef.current);
    }
    announcementTimeoutRef.current = window.setTimeout(() => setAnnouncement(''), 1000);
  }, [setActiveOrg]);

  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current !== null) {
        window.clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  if (!hasMultipleOrgs) {
    return null;
  }

  const dropdownItems: DropdownItem[] = useMemo(
    () =>
      memberships.map(membership => ({
        id: membership.organizationId,
        label: membership.organizationName,
        description: getRoleLabel(membership.role),
        role: 'menuitemradio',
        onSelect: () => handleOrgSelect(membership),
      })),
    [memberships, handleOrgSelect]
  );

  return (
    <div className="org-selector-container">
      <Dropdown
        items={dropdownItems}
        selectedId={activeOrg?.id}
        label="Select organization"
        placement="bottom-left"
        className="org-selector-dropdown-root"
        menuClassName="org-selector-dropdown"
        testId="org-selector"
        renderTrigger={({ ref, open, ariaControls, getReferenceProps }) => (
          <>
            <span className="org-selector-label" id="org-selector-label">
              Organization:
            </span>
            <button
              type="button"
              className="org-selector-button"
              data-testid="org-selector-button"
              {...getReferenceProps({
                ref,
                id: 'org-selector-button',
                'aria-haspopup': 'menu',
                'aria-expanded': open,
                'aria-labelledby': 'org-selector-label org-selector-button',
                'aria-controls': ariaControls,
              })}
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
                {open ? '▲' : '▼'}
              </span>
            </button>
          </>
        )}
        renderItem={(item, state) => {
          const membership = memberships.find(m => m.organizationId === item.id);
          if (!membership) {
            return null;
          }
          const isActive = activeOrg?.id === membership.organizationId;
          const isTruncated = membership.organizationName.length > TRUNCATE_THRESHOLD;

          return (
            <li
              key={membership.organizationId}
              className={`org-selector-option ${isActive ? 'active' : ''} ${state.focused ? 'focused' : ''}`}
              data-testid={`org-option-${membership.organizationId}`}
            >
              <button
                type="button"
                className="org-selector-option-button"
                {...state.getItemProps({
                  role: 'menuitemradio',
                  'aria-checked': isActive,
                  onMouseEnter: () => {
                    if (isTruncated) {
                      setShowTooltip(membership.organizationId);
                    }
                  },
                  onMouseLeave: () => setShowTooltip(null),
                })}
                ref={state.ref}
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
              </button>
            </li>
          );
        }}
      />

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
