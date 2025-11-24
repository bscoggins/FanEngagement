import React from 'react';
import { useActiveOrganization } from '../contexts/OrgContext';
import type { MembershipWithOrganizationDto } from '../types/api';

export const OrganizationSelector: React.FC = () => {
  const { activeOrg, setActiveOrg, memberships, hasMultipleOrgs } = useActiveOrganization();

  // Don't show selector if user doesn't have multiple orgs
  if (!hasMultipleOrgs) {
    return null;
  }

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orgId = e.target.value;
    const membership = memberships.find(m => m.organizationId === orgId);
    if (membership) {
      setActiveOrg({
        id: membership.organizationId,
        name: membership.organizationName,
        role: membership.role,
      });
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <label
        htmlFor="org-selector"
        style={{
          fontSize: '0.875rem',
          color: '#666',
          fontWeight: '500',
        }}
      >
        Organization:
      </label>
      <select
        id="org-selector"
        value={activeOrg?.id || ''}
        onChange={handleOrgChange}
        style={{
          padding: '0.5rem',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '0.875rem',
          backgroundColor: 'white',
          cursor: 'pointer',
        }}
      >
        {memberships.map((membership: MembershipWithOrganizationDto) => (
          <option key={membership.organizationId} value={membership.organizationId}>
            {membership.organizationName} ({membership.role === 'OrgAdmin' ? 'Admin' : 'Member'})
          </option>
        ))}
      </select>
      {activeOrg && (
        <span
          style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: activeOrg.role === 'OrgAdmin' ? '#007bff' : '#6c757d',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
          }}
        >
          {activeOrg.role === 'OrgAdmin' ? 'Org Admin' : 'Member'}
        </span>
      )}
    </div>
  );
};
