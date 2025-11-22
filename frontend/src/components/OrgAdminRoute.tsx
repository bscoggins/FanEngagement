import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

interface OrgAdminRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that ensures the current user is either:
 * - A Global Admin (platform-wide), or
 * - An OrgAdmin for the specific organization in the route
 * 
 * Redirects to home if user is not authenticated or not authorized.
 * 
 * @example
 * <OrgAdminRoute>
 *   <AdminOrganizationEditPage />
 * </OrgAdminRoute>
 */
export const OrgAdminRoute: React.FC<OrgAdminRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { isGlobalAdmin, isOrgAdmin, isLoading } = usePermissions();
  const { orgId } = useParams<{ orgId: string }>();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Wait for memberships to load before making decision
  if (isLoading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  // Global admins have access to all org admin routes
  if (isGlobalAdmin()) {
    return <>{children}</>;
  }

  // Check if user is an OrgAdmin for this specific organization
  if (orgId && isOrgAdmin(orgId)) {
    return <>{children}</>;
  }

  // User is not authorized - redirect to home
  return <Navigate to="/" replace />;
};
