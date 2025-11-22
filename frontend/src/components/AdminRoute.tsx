import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

interface AdminRouteProps {
  children: React.ReactNode;
  /**
   * If true, allows OrgAdmins to pass through (for /admin layout parent route)
   * If false, requires GlobalAdmin only (for platform-level pages)
   */
  allowOrgAdmin?: boolean;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children, allowOrgAdmin = false }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { memberships, isLoading } = usePermissions();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // GlobalAdmins always have access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Show loading while memberships are being fetched (only matters when allowOrgAdmin is true)
  if (allowOrgAdmin && isLoading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  // If allowOrgAdmin is true and user has at least one OrgAdmin membership, allow access
  if (allowOrgAdmin && memberships.some(m => m.role === 'OrgAdmin')) {
    return <>{children}</>;
  }

  // Otherwise, redirect to home
  return <Navigate to="/" replace />;
};
