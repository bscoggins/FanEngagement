import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface PlatformAdminRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that only allows platform administrators (GlobalAdmin) to access.
 * Non-platform admins are redirected to their appropriate dashboard.
 */
export const PlatformAdminRoute: React.FC<PlatformAdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only GlobalAdmins can access platform admin routes
  if (!isAdmin) {
    // Redirect non-admins to member dashboard
    return <Navigate to="/me/home" replace />;
  }

  return <>{children}</>;
};
