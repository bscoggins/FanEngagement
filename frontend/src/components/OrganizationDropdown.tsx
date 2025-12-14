import React, { useMemo } from 'react';
import type { MembershipWithOrganizationDto } from '../types/api';
import { getRoleBadgeClass, getRoleLabel } from '../utils/roleUtils';
import { Dropdown, type DropdownItem } from './Dropdown';
import './OrganizationDropdown.css';

interface OrganizationDropdownProps {
  memberships: MembershipWithOrganizationDto[];
  activeOrgId?: string;
  onSelect: (orgId: string) => void;
  testId?: string;
}

export const OrganizationDropdown: React.FC<OrganizationDropdownProps> = ({
  memberships,
  activeOrgId,
  onSelect,
  testId,
}) => {
  const baseTestId = testId || 'org-dropdown';

  const activeMembership = useMemo(() => {
    if (memberships.length === 0) {
      return undefined;
    }

    if (activeOrgId) {
      return memberships.find(m => m.organizationId === activeOrgId) ?? memberships[0];
    }

    return memberships[0];
  }, [memberships, activeOrgId]);

  if (memberships.length === 0) {
    return null;
  }

  const dropdownItems: DropdownItem[] = useMemo(
    () =>
      memberships.map(membership => ({
        id: membership.organizationId,
        label: membership.organizationName,
        description: getRoleLabel(membership.role),
        icon: '🏢',
        role: 'menuitemradio',
        onSelect: () => onSelect(membership.organizationId),
      })),
    [memberships, onSelect]
  );

  return (
    <Dropdown
      items={dropdownItems}
      selectedId={activeMembership?.organizationId}
      label="Select organization"
      placement="bottom-right"
      className="org-dropdown"
      menuClassName="org-dropdown-menu"
      testId={baseTestId}
      renderTrigger={({ ref, open, ariaControls, getReferenceProps }) => (
        <button
          type="button"
          className="org-dropdown-button"
          data-testid={`${baseTestId}-button`}
          {...getReferenceProps({
            ref,
            'aria-controls': ariaControls,
            'aria-expanded': open,
            'aria-haspopup': 'menu',
          })}
        >
          <span className="org-dropdown-icon" aria-hidden="true">🏢</span>
          <div className="org-dropdown-text" aria-live="polite">
            <span className="org-dropdown-meta">Organization</span>
            <span className="org-dropdown-value">
              {activeMembership?.organizationName ?? 'Select organization'}
            </span>
          </div>
          {activeMembership && (
            <span
              className={`org-dropdown-role-badge ${getRoleBadgeClass(activeMembership.role)}`}
              aria-label={`Role: ${getRoleLabel(activeMembership.role)}`}
            >
              {getRoleLabel(activeMembership.role)}
            </span>
          )}
          <span className="org-dropdown-arrow" aria-hidden="true">
            {open ? '▲' : '▼'}
          </span>
        </button>
      )}
      renderItem={(item, state) => {
        const membership = memberships.find(m => m.organizationId === item.id);
        if (!membership) {
          return null;
        }
        const isActive = activeMembership?.organizationId === membership.organizationId;

        return (
          <React.Fragment key={item.id}>
            {state.index === 0 && (
              <li className="org-dropdown-title" role="presentation">
                Your Organizations
              </li>
            )}
            <li role="none">
              <button
                type="button"
                className={`org-dropdown-item ${isActive ? 'active' : ''}`}
                data-testid={`org-option-${membership.organizationId}`}
                {...state.getItemProps({
                  role: 'menuitemradio',
                  'aria-checked': isActive,
                })}
              >
                <span className="org-dropdown-item-icon" aria-hidden="true">🏢</span>
                <div className="org-dropdown-item-content">
                  <span className="org-dropdown-item-name">{membership.organizationName}</span>
                  <span className="org-dropdown-item-role">
                    {getRoleLabel(membership.role)}
                  </span>
                </div>
                {isActive && (
                  <span className="org-dropdown-check" aria-hidden="true">✓</span>
                )}
              </button>
            </li>
          </React.Fragment>
        );
      }}
    />
  );
};
