import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MembershipWithOrganizationDto } from '../types/api';
import { getRoleBadgeClass, getRoleLabel } from '../utils/roleUtils';
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const baseTestId = testId || 'organization-dropdown';

  const activeMembership = useMemo(() => {
    if (memberships.length === 0) {
      return undefined;
    }

    if (activeOrgId) {
      return memberships.find(m => m.organizationId === activeOrgId) ?? memberships[0];
    }

    return memberships[0];
  }, [memberships, activeOrgId]);

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback((orgId: string) => {
    onSelect(orgId);
    closeDropdown();
  }, [onSelect, closeDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, closeDropdown]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, closeDropdown]);

  if (memberships.length === 0) {
    return null;
  }

  const selectedLabel = activeMembership?.organizationName ?? 'Select organization';

  return (
    <div
      ref={dropdownRef}
      className="org-dropdown"
      data-testid={baseTestId}
    >
      <button
        type="button"
        className="org-dropdown-button"
        onClick={toggleDropdown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="org-dropdown-menu"
        data-testid={`${baseTestId}-button`}
      >
        <span className="org-dropdown-icon" aria-hidden="true">🏢</span>
        <div className="org-dropdown-text" aria-live="polite">
          <span className="org-dropdown-meta">Organization</span>
          <span className="org-dropdown-value">{selectedLabel}</span>
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
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div
          id="org-dropdown-menu"
          className="org-dropdown-menu"
          role="menu"
          aria-label="Select organization"
        >
          <div className="org-dropdown-title">Your Organizations</div>
          <div className="org-dropdown-list">
            {memberships.map(membership => {
              const isActive = activeMembership?.organizationId === membership.organizationId;
              return (
                <button
                  key={membership.organizationId}
                  type="button"
                  className={`org-dropdown-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelect(membership.organizationId)}
                  role="menuitemradio"
                  aria-checked={isActive}
                  data-testid={`org-option-${membership.organizationId}`}
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
