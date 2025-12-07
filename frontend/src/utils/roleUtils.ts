/**
 * Role-related utility functions
 * Provides consistent role handling across the application
 */

/**
 * Valid role types in the application
 */
export type RoleType = 'OrgAdmin' | 'Member';

/**
 * Get the CSS class name for a role badge
 * @param role - The role to get the class for
 * @returns The CSS class name ('admin' or 'member')
 */
export const getRoleBadgeClass = (role: RoleType): string => {
  return role === 'OrgAdmin' ? 'admin' : 'member';
};

/**
 * Get the display label for a role
 * @param role - The role to get the label for
 * @returns The display label ('Admin' or 'Member')
 */
export const getRoleLabel = (role: RoleType): string => {
  return role === 'OrgAdmin' ? 'Admin' : 'Member';
};

/**
 * Get the full display name for a role (e.g., 'Org Admin')
 * @param role - The role to get the full name for
 * @returns The full display name ('Org Admin' or 'Member')
 */
export const getRoleFullName = (role: RoleType): string => {
  return role === 'OrgAdmin' ? 'Org Admin' : 'Member';
};
