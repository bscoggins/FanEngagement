/**
 * Utilities for managing recently viewed items in localStorage
 * Recents are stored per-user to prevent data leakage between sessions
 */

export type RecentItemType = 
  | 'organization' 
  | 'user' 
  | 'proposal' 
  | 'member' 
  | 'shareType';

export interface RecentItem {
  id: string;
  name: string;
  type: RecentItemType;
  timestamp: number;
  /** Optional organization ID for org-scoped resources */
  organizationId?: string;
  /** Optional subtitle for additional context */
  subtitle?: string;
}

const STORAGE_KEY_PREFIX = 'fan_engagement_recents';
const MAX_RECENTS = 10;

/**
 * Get the storage key for a specific user
 */
const getStorageKey = (userId?: string): string => {
  if (!userId) {
    // Fallback for unauthenticated state - should not normally be used
    return STORAGE_KEY_PREFIX;
  }
  return `${STORAGE_KEY_PREFIX}_${userId}`;
};

/**
 * Get all recent items from localStorage for a specific user
 */
export const getRecents = (userId?: string): RecentItem[] => {
  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (!stored) return [];
    
    const items = JSON.parse(stored) as RecentItem[];
    // Sort by timestamp descending (most recent first)
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_RECENTS);
  } catch (error) {
    console.error('Failed to load recents from localStorage:', error);
    return [];
  }
};

/**
 * Add an item to recents for a specific user, removing duplicates and limiting to MAX_RECENTS
 */
export const addRecent = (item: Omit<RecentItem, 'timestamp'>, userId?: string): void => {
  try {
    const existing = getRecents(userId);
    
    // Remove any existing item with the same id AND type
    const filtered = existing.filter(r => !(r.id === item.id && r.type === item.type));
    
    // Add new item at the front with current timestamp
    const updated = [
      { ...item, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENTS);
    
    localStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent to localStorage:', error);
  }
};

/**
 * Clear all recents for a specific user
 */
export const clearRecents = (userId?: string): void => {
  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch (error) {
    console.error('Failed to clear recents from localStorage:', error);
  }
};

/**
 * Get recent items by type for a specific user
 */
export const getRecentsByType = (type: RecentItemType, userId?: string): RecentItem[] => {
  return getRecents(userId).filter(item => item.type === type);
};

/**
 * Get the icon for a recent item type
 */
export const getRecentItemIcon = (type: RecentItemType): string => {
  switch (type) {
    case 'user':
      return '👤';
    case 'organization':
      return '🏢';
    case 'proposal':
      return '📋';
    case 'member':
      return '👥';
    case 'shareType':
      return '📊';
    default:
      return '📄';
  }
};

/**
 * Get the label for a recent item type
 */
export const getRecentItemLabel = (type: RecentItemType): string => {
  switch (type) {
    case 'user':
      return 'User';
    case 'organization':
      return 'Organization';
    case 'proposal':
      return 'Proposal';
    case 'member':
      return 'Member';
    case 'shareType':
      return 'Share Type';
    default:
      return 'Item';
  }
};
