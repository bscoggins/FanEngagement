/**
 * Search configuration types and constants for the global search feature.
 * Defines what resources can be searched and how results are displayed
 * based on user role and organization context.
 */

/**
 * Types of resources that can be searched
 */
export type SearchableResource =
  | 'users'
  | 'organizations'
  | 'proposals'
  | 'members'
  | 'shareTypes';

/**
 * Route modes determine how navigation works after selecting a search result
 */
export type SearchRouteMode = 'platformAdmin' | 'orgAdmin' | 'member';

/**
 * Configuration for the search context based on user role and active organization
 */
export interface SearchContextConfig {
  /** Resources available to search */
  resources: SearchableResource[];
  /** Active organization ID (if any) */
  organizationId?: string;
  /** Active organization name (for display in placeholder) */
  organizationName?: string;
  /** Placeholder text for the search input */
  placeholder: string;
  /** Determines navigation routes when selecting results */
  routeMode: SearchRouteMode;
}

/**
 * Maximum number of results to show per resource type
 */
export const SEARCH_LIMITS: Record<SearchableResource, number> = {
  users: 8,
  organizations: 8,
  proposals: 8,
  members: 6,
  shareTypes: 5,
};

/**
 * Feature flag: Whether members can search and see other members in the organization
 * Set to false to hide member search from regular members
 */
export const MEMBERS_CAN_SEARCH_MEMBERS = false;

/**
 * Icons for each searchable resource type
 */
export const SEARCH_RESOURCE_ICONS: Record<SearchableResource, string> = {
  users: '👤',
  organizations: '🏢',
  proposals: '📋',
  members: '👥',
  shareTypes: '📊',
};

/**
 * Display labels for each searchable resource type (plural form for section headers)
 */
export const SEARCH_RESOURCE_LABELS: Record<SearchableResource, string> = {
  users: 'Users',
  organizations: 'Organizations',
  proposals: 'Proposals',
  members: 'Members',
  shareTypes: 'Share Types',
};

/**
 * Get the placeholder text based on available resources
 */
export function getSearchPlaceholder(resources: SearchableResource[], orgName?: string): string {
  if (resources.length === 0) {
    return 'Search...';
  }

  // Platform admin searching users and organizations
  if (resources.includes('users') && resources.includes('organizations')) {
    return 'Search users, organizations...';
  }

  // Org context: search within organization
  if (orgName) {
    const resourceLabels = resources
      .filter(r => r !== 'organizations') // Don't include "organizations" when in org context
      .map(r => SEARCH_RESOURCE_LABELS[r].toLowerCase())
      .slice(0, 3); // Limit to 3 for brevity
    
    if (resourceLabels.length > 0) {
      return `Search ${resourceLabels.join(', ')}...`;
    }
  }

  // No org context: just organizations
  if (resources.length === 1 && resources[0] === 'organizations') {
    return 'Search organizations...';
  }

  // Generic fallback
  const labels = resources.map(r => SEARCH_RESOURCE_LABELS[r].toLowerCase()).slice(0, 3);
  return `Search ${labels.join(', ')}...`;
}
