import type { LoginResponse, MembershipWithOrganizationDto } from '../types/api';
import { getDefaultHomeRoute, type NavContext } from '../navigation';

/**
 * Checks if the user has platform admin (GlobalAdmin) role.
 * 
 * @param user - The logged-in user from LoginResponse
 * @returns true if the user is a platform admin
 */
export const isPlatformAdmin = (user: LoginResponse | null): boolean => {
  return user?.role === 'Admin';
};

/**
 * Determines the default landing route for a user based on their role.
 * 
 * This function uses the centralized navigation configuration to determine
 * the appropriate home route for the user.
 * 
 * - Platform admins (GlobalAdmin): Land on platform admin dashboard
 * - OrgAdmins (non-GlobalAdmin): Land on admin dashboard where they can manage their orgs
 * - Regular members: Land on member dashboard (/me/home)
 * 
 * @param user - The logged-in user from LoginResponse
 * @param memberships - The user's organization memberships (optional, used to determine OrgAdmin status)
 * @returns The route path to navigate to
 */
export const getDefaultRouteForUser = (
  user: LoginResponse | null,
  memberships?: MembershipWithOrganizationDto[]
): string => {
  // Build nav context from user and memberships
  const context: NavContext = {
    isAuthenticated: !!user,
    isPlatformAdmin: user?.role === 'Admin',
    memberships: memberships || [],
  };

  return getDefaultHomeRoute(context);
};
