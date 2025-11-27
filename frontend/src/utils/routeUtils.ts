import type { LoginResponse } from '../types/api';
import type { MembershipWithOrganizationDto } from '../types/api';

/**
 * Determines the default landing route for a user based on their role.
 * 
 * - Platform admins (GlobalAdmin): Land on admin dashboard
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
  if (!user) {
    return '/login';
  }

  // Platform admins (GlobalAdmin) go to admin dashboard
  if (user.role === 'Admin') {
    return '/admin';
  }

  // OrgAdmins (who are not GlobalAdmins) go to admin dashboard
  // to manage their organizations
  if (memberships && memberships.some(m => m.role === 'OrgAdmin')) {
    return '/admin';
  }

  // Regular members go to member dashboard
  return '/me/home';
};
