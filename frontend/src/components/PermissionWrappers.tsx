import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface IfGlobalAdminProps {
  children: React.ReactNode;
}

/**
 * Conditionally renders children only if the current user is a Global Admin.
 * 
 * @example
 * <IfGlobalAdmin>
 *   <button>Platform Admin Action</button>
 * </IfGlobalAdmin>
 */
export const IfGlobalAdmin: React.FC<IfGlobalAdminProps> = ({ children }) => {
  const { isGlobalAdmin } = usePermissions();
  
  if (!isGlobalAdmin()) {
    return null;
  }
  
  return <>{children}</>;
};

interface IfOrgAdminProps {
  orgId: string;
  children: React.ReactNode;
}

/**
 * Conditionally renders children only if the current user is an OrgAdmin
 * for the specified organization (or is a Global Admin).
 * 
 * @example
 * <IfOrgAdmin orgId={organizationId}>
 *   <button>Manage Organization</button>
 * </IfOrgAdmin>
 */
export const IfOrgAdmin: React.FC<IfOrgAdminProps> = ({ orgId, children }) => {
  const { isOrgAdmin } = usePermissions();
  
  if (!isOrgAdmin(orgId)) {
    return null;
  }
  
  return <>{children}</>;
};

interface IfOrgMemberProps {
  orgId: string;
  children: React.ReactNode;
}

/**
 * Conditionally renders children only if the current user is a member
 * of the specified organization (including OrgAdmins and Global Admins).
 * 
 * @example
 * <IfOrgMember orgId={organizationId}>
 *   <div>Member-only content</div>
 * </IfOrgMember>
 */
export const IfOrgMember: React.FC<IfOrgMemberProps> = ({ orgId, children }) => {
  const { isOrgMember } = usePermissions();
  
  if (!isOrgMember(orgId)) {
    return null;
  }
  
  return <>{children}</>;
};
