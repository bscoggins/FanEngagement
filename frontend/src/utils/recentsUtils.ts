/**
 * Utilities for managing recently viewed items in localStorage
 */

export interface RecentItem {
  id: string;
  name: string;
  type: 'organization' | 'user';
  timestamp: number;
}

const STORAGE_KEY = 'fan_engagement_recents';
const MAX_RECENTS = 5;

/**
 * Get all recent items from localStorage
 */
export const getRecents = (): RecentItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
 * Add an item to recents, removing duplicates and limiting to MAX_RECENTS
 */
export const addRecent = (item: Omit<RecentItem, 'timestamp'>): void => {
  try {
    const existing = getRecents();
    
    // Remove any existing item with the same id AND type
    const filtered = existing.filter(r => !(r.id === item.id && r.type === item.type));
    
    // Add new item at the front with current timestamp
    const updated = [
      { ...item, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENTS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent to localStorage:', error);
  }
};

/**
 * Clear all recents
 */
export const clearRecents = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear recents from localStorage:', error);
  }
};

/**
 * Get recent items by type
 */
export const getRecentsByType = (type: 'organization' | 'user'): RecentItem[] => {
  return getRecents().filter(item => item.type === type);
};
