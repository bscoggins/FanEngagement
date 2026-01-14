import { describe, it, expect, beforeEach } from 'vitest';
import { getRecents, addRecent, clearRecents, getRecentsByType, type RecentItem } from './recentsUtils';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('recentsUtils', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getRecents', () => {
    it('should return empty array when no recents exist', () => {
      const recents = getRecents();
      expect(recents).toEqual([]);
    });

    it('should return sorted recents by timestamp descending', () => {
      const items: RecentItem[] = [
        { id: '1', name: 'First', type: 'user', timestamp: 1000 },
        { id: '2', name: 'Second', type: 'organization', timestamp: 3000 },
        { id: '3', name: 'Third', type: 'user', timestamp: 2000 },
      ];
      localStorageMock.setItem('fan_engagement_recents', JSON.stringify(items));

      const recents = getRecents();
      expect(recents[0].id).toBe('2');
      expect(recents[1].id).toBe('3');
      expect(recents[2].id).toBe('1');
    });

    it('should limit to 10 recents', () => {
      const items: RecentItem[] = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        name: `Item ${i}`,
        type: 'user' as const,
        timestamp: i,
      }));
      localStorageMock.setItem('fan_engagement_recents', JSON.stringify(items));

      const recents = getRecents();
      expect(recents).toHaveLength(10);
    });

    it('should handle invalid JSON gracefully', () => {
      localStorageMock.setItem('fan_engagement_recents', 'invalid json');
      const recents = getRecents();
      expect(recents).toEqual([]);
    });
  });

  describe('addRecent', () => {
    it('should add a new recent item', () => {
      addRecent({ id: '1', name: 'Test User', type: 'user' });
      const recents = getRecents();
      expect(recents).toHaveLength(1);
      expect(recents[0].id).toBe('1');
      expect(recents[0].name).toBe('Test User');
      expect(recents[0].type).toBe('user');
    });

    it('should remove duplicate and add to front', () => {
      addRecent({ id: '1', name: 'First', type: 'user' });
      addRecent({ id: '2', name: 'Second', type: 'organization' });
      addRecent({ id: '1', name: 'First Updated', type: 'user' });

      const recents = getRecents();
      expect(recents).toHaveLength(2);
      expect(recents[0].id).toBe('1');
      expect(recents[0].name).toBe('First Updated');
      expect(recents[1].id).toBe('2');
    });

    it('should limit to 10 items', () => {
      for (let i = 0; i < 12; i++) {
        addRecent({ id: `${i}`, name: `Item ${i}`, type: 'user' });
      }

      const recents = getRecents();
      expect(recents).toHaveLength(10);
      expect(recents[0].id).toBe('11');
      expect(recents[9].id).toBe('2');
    });

    it('should add timestamp automatically', () => {
      const before = Date.now();
      addRecent({ id: '1', name: 'Test', type: 'user' });
      const after = Date.now();

      const recents = getRecents();
      expect(recents[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(recents[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('clearRecents', () => {
    it('should clear all recents', () => {
      addRecent({ id: '1', name: 'Test', type: 'user' });
      addRecent({ id: '2', name: 'Test 2', type: 'organization' });

      clearRecents();

      const recents = getRecents();
      expect(recents).toEqual([]);
    });
  });

  describe('getRecentsByType', () => {
    beforeEach(() => {
      addRecent({ id: '1', name: 'User 1', type: 'user' });
      addRecent({ id: '2', name: 'Org 1', type: 'organization' });
      addRecent({ id: '3', name: 'User 2', type: 'user' });
      addRecent({ id: '4', name: 'Org 2', type: 'organization' });
    });

    it('should return only user recents', () => {
      const userRecents = getRecentsByType('user');
      expect(userRecents).toHaveLength(2);
      expect(userRecents.every(r => r.type === 'user')).toBe(true);
    });

    it('should return only organization recents', () => {
      const orgRecents = getRecentsByType('organization');
      expect(orgRecents).toHaveLength(2);
      expect(orgRecents.every(r => r.type === 'organization')).toBe(true);
    });
  });
});
