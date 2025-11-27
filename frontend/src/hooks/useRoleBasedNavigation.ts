import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDefaultRouteForUser } from '../utils/routeUtils';
import { membershipsApi } from '../api/membershipsApi';
import type { LoginResponse } from '../types/api';

/**
 * Hook that provides role-based navigation functionality.
 * This centralizes the logic for determining where to redirect users based on their role.
 */
export const useRoleBasedNavigation = () => {
  const navigate = useNavigate();

  /**
   * Navigates to the appropriate default route based on the user's role.
   * - Platform admins go to /admin
   * - Organization admins go to /admin
   * - Regular members go to /me/home
   * 
   * @param user - The logged-in user
   * @param options - Navigation options (e.g., replace: true)
   */
  const navigateToDefaultRoute = useCallback(async (
    user: LoginResponse,
    options?: { replace?: boolean }
  ) => {
    // For platform admins, redirect immediately without fetching memberships
    if (user.role === 'Admin') {
      navigate(getDefaultRouteForUser(user), options);
      return;
    }

    // For non-admins, fetch memberships to determine if they're OrgAdmin
    try {
      const memberships = await membershipsApi.getByUserId(user.userId);
      navigate(getDefaultRouteForUser(user, memberships), options);
    } catch {
      // On error, use default route without memberships (falls back to /me/home)
      navigate(getDefaultRouteForUser(user), options);
    }
  }, [navigate]);

  return { navigateToDefaultRoute };
};
