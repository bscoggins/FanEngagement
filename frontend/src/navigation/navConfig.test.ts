import { describe, it, expect } from 'vitest';
import type { MembershipWithOrganizationDto } from '../types/api';
import type {
  NavContext,
} from './navConfig';
import {
  navItems,
  getUserRoles,
  getVisibleNavItems,
  getDefaultHomeRoute,
  resolvePath,
  getResolvedNavItem,
} from './navConfig';

describe('navConfig', () => {
  // Helper function to create test context
  const createContext = (
    overrides: Partial<NavContext> = {}
  ): NavContext => ({
    isAuthenticated: true,
    isPlatformAdmin: false,
    memberships: [],
    ...overrides,
  });

  // Helper function to create a membership
  const createMembership = (
    overrides: Partial<MembershipWithOrganizationDto> = {}
  ): MembershipWithOrganizationDto => ({
    id: 'membership-1',
    organizationId: 'org-1',
    organizationName: 'Test Org',
    userId: 'user-1',
    role: 'Member',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('getUserRoles', () => {
    it('returns empty array for unauthenticated users', () => {
      const context = createContext({ isAuthenticated: false });
      expect(getUserRoles(context)).toEqual([]);
    });

    it('returns Member role for regular authenticated users', () => {
      const context = createContext({ memberships: [] });
      const roles = getUserRoles(context);
      expect(roles).toContain('Member');
      expect(roles).not.toContain('OrgAdmin');
      expect(roles).not.toContain('PlatformAdmin');
    });

    it('returns OrgAdmin and Member roles for OrgAdmin users', () => {
      const context = createContext({
        memberships: [createMembership({ role: 'OrgAdmin' })],
      });
      const roles = getUserRoles(context);
      expect(roles).toContain('OrgAdmin');
      expect(roles).toContain('Member');
      expect(roles).not.toContain('PlatformAdmin');
    });

    it('returns PlatformAdmin and Member roles for platform admins', () => {
      const context = createContext({
        isPlatformAdmin: true,
        memberships: [],
      });
      const roles = getUserRoles(context);
      expect(roles).toContain('PlatformAdmin');
      expect(roles).toContain('Member');
    });

    it('returns all roles for platform admin with OrgAdmin membership', () => {
      const context = createContext({
        isPlatformAdmin: true,
        memberships: [createMembership({ role: 'OrgAdmin' })],
      });
      const roles = getUserRoles(context);
      expect(roles).toContain('PlatformAdmin');
      expect(roles).toContain('OrgAdmin');
      expect(roles).toContain('Member');
    });
  });

  describe('getDefaultHomeRoute', () => {
    it('returns /login for unauthenticated users', () => {
      const context = createContext({ isAuthenticated: false });
      expect(getDefaultHomeRoute(context)).toBe('/login');
    });

    it('returns /me/home for regular members', () => {
      const context = createContext({ memberships: [] });
      expect(getDefaultHomeRoute(context)).toBe('/me/home');
    });

    it('returns /admin for OrgAdmin users', () => {
      const context = createContext({
        memberships: [createMembership({ role: 'OrgAdmin' })],
      });
      expect(getDefaultHomeRoute(context)).toBe('/admin');
    });

    it('returns /platform-admin/dashboard for platform admins', () => {
      const context = createContext({
        isPlatformAdmin: true,
        memberships: [],
      });
      expect(getDefaultHomeRoute(context)).toBe('/platform-admin/dashboard');
    });

    it('returns /platform-admin/dashboard for platform admins even with OrgAdmin role', () => {
      const context = createContext({
        isPlatformAdmin: true,
        memberships: [createMembership({ role: 'OrgAdmin' })],
      });
      expect(getDefaultHomeRoute(context)).toBe('/platform-admin/dashboard');
    });

    it('returns /admin for OrgAdmin when active org is their admin org', () => {
      const context = createContext({
        memberships: [
          createMembership({ role: 'OrgAdmin', organizationId: 'org-1' }),
          createMembership({ role: 'Member', organizationId: 'org-2' }),
        ],
        activeOrgId: 'org-1',
        activeOrgRole: 'OrgAdmin',
      });
      expect(getDefaultHomeRoute(context)).toBe('/admin');
    });

    it('returns /me/home for OrgAdmin when active org is their member-only org', () => {
      const context = createContext({
        memberships: [
          createMembership({ role: 'OrgAdmin', organizationId: 'org-1' }),
          createMembership({ role: 'Member', organizationId: 'org-2' }),
        ],
        activeOrgId: 'org-2',
        activeOrgRole: 'Member',
      });
      expect(getDefaultHomeRoute(context)).toBe('/me/home');
    });

    it('returns /admin for OrgAdmin when no active org is selected', () => {
      const context = createContext({
        memberships: [
          createMembership({ role: 'OrgAdmin', organizationId: 'org-1' }),
          createMembership({ role: 'Member', organizationId: 'org-2' }),
        ],
      });
      expect(getDefaultHomeRoute(context)).toBe('/admin');
    });
  });

  describe('resolvePath', () => {
    it('replaces :orgId placeholder with actual org ID', () => {
      const path = '/admin/organizations/:orgId/memberships';
      expect(resolvePath(path, 'org-123')).toBe('/admin/organizations/org-123/memberships');
    });

    it('returns original path when no org ID provided', () => {
      const path = '/admin/organizations/:orgId/memberships';
      expect(resolvePath(path, undefined)).toBe(path);
    });

    it('returns path as-is when no placeholder present', () => {
      const path = '/admin/users';
      expect(resolvePath(path, 'org-123')).toBe('/admin/users');
    });
  });

  describe('getVisibleNavItems', () => {
    it('returns empty array for unauthenticated users', () => {
      const context = createContext({ isAuthenticated: false });
      expect(getVisibleNavItems(context)).toEqual([]);
    });

    describe('Regular Member', () => {
      it('sees only user-scoped items', () => {
        const context = createContext({ memberships: [] });
        const items = getVisibleNavItems(context);
        
        // Should see user items
        expect(items.find(i => i.id === 'home')).toBeDefined();
        expect(items.find(i => i.id === 'myAccount')).toBeDefined();
        expect(items.find(i => i.id === 'myOrganizations')).toBeDefined();
        
        // Should NOT see admin items
        expect(items.find(i => i.id === 'platformDashboard')).toBeUndefined();
        expect(items.find(i => i.id === 'manageUsers')).toBeUndefined();
        expect(items.find(i => i.id === 'manageOrganizations')).toBeUndefined();
        expect(items.find(i => i.id === 'adminDashboard')).toBeUndefined();
      });

      it('does NOT see org-scoped items even with active org', () => {
        const context = createContext({
          memberships: [createMembership({ role: 'Member' })],
          activeOrgId: 'org-1',
          activeOrgRole: 'Member',
        });
        const items = getVisibleNavItems(context);
        
        // Should NOT see org admin items
        expect(items.find(i => i.id === 'manageMemberships')).toBeUndefined();
        expect(items.find(i => i.id === 'manageShareTypes')).toBeUndefined();
      });
    });

    describe('OrgAdmin', () => {
      it('sees user items plus admin dashboard', () => {
        const context = createContext({
          memberships: [createMembership({ role: 'OrgAdmin' })],
        });
        const items = getVisibleNavItems(context);
        
        // Should see user items
        expect(items.find(i => i.id === 'home')).toBeDefined();
        expect(items.find(i => i.id === 'myAccount')).toBeDefined();
        expect(items.find(i => i.id === 'myOrganizations')).toBeDefined();
        
        // Should see admin dashboard
        expect(items.find(i => i.id === 'adminDashboard')).toBeDefined();
        
        // Should NOT see platform admin items
        expect(items.find(i => i.id === 'platformDashboard')).toBeUndefined();
        expect(items.find(i => i.id === 'manageUsers')).toBeUndefined();
      });

      it('sees org-scoped items when there is an active org', () => {
        const context = createContext({
          memberships: [createMembership({ role: 'OrgAdmin', organizationId: 'org-1' })],
          activeOrgId: 'org-1',
          activeOrgRole: 'OrgAdmin',
        });
        const items = getVisibleNavItems(context);
        
        // Should see org-scoped items
        expect(items.find(i => i.id === 'manageMemberships')).toBeDefined();
        expect(items.find(i => i.id === 'manageShareTypes')).toBeDefined();
        expect(items.find(i => i.id === 'manageProposals')).toBeDefined();
      });

      it('does NOT see org items for org where not admin', () => {
        const context = createContext({
          memberships: [
            createMembership({ role: 'OrgAdmin', organizationId: 'org-1' }),
            createMembership({ role: 'Member', organizationId: 'org-2' }),
          ],
          activeOrgId: 'org-2',
          activeOrgRole: 'Member',
        });
        const items = getVisibleNavItems(context);
        
        // Should NOT see org-scoped items (not admin for this org)
        expect(items.find(i => i.id === 'manageMemberships')).toBeUndefined();
      });
    });

    describe('PlatformAdmin', () => {
      it('sees all platform admin items', () => {
        const context = createContext({
          isPlatformAdmin: true,
          memberships: [],
        });
        const items = getVisibleNavItems(context);
        
        // Should see user items
        expect(items.find(i => i.id === 'home')).toBeDefined();
        expect(items.find(i => i.id === 'myAccount')).toBeDefined();
        expect(items.find(i => i.id === 'myOrganizations')).toBeDefined();
        
        // Should see platform admin items
        expect(items.find(i => i.id === 'platformDashboard')).toBeDefined();
        expect(items.find(i => i.id === 'adminDashboard')).toBeDefined();
        expect(items.find(i => i.id === 'manageUsers')).toBeDefined();
        expect(items.find(i => i.id === 'manageOrganizations')).toBeDefined();
        expect(items.find(i => i.id === 'devTools')).toBeDefined();
      });

      it('sees org-scoped items when there is an active org (even without explicit membership)', () => {
        const context = createContext({
          isPlatformAdmin: true,
          memberships: [],
          activeOrgId: 'org-1',
        });
        const items = getVisibleNavItems(context);
        
        // Platform admin has implicit access to all org-scoped items
        expect(items.find(i => i.id === 'manageMemberships')).toBeDefined();
        expect(items.find(i => i.id === 'manageShareTypes')).toBeDefined();
      });
    });

    describe('filtering options', () => {
      it('filters by scope', () => {
        const context = createContext({
          isPlatformAdmin: true,
          memberships: [],
          activeOrgId: 'org-1',
        });
        
        const userItems = getVisibleNavItems(context, { scope: 'user' });
        expect(userItems.every(i => i.scope === 'user')).toBe(true);
        
        const globalItems = getVisibleNavItems(context, { scope: 'global' });
        expect(globalItems.every(i => i.scope === 'global')).toBe(true);
        
        const orgItems = getVisibleNavItems(context, { scope: 'org' });
        expect(orgItems.every(i => i.scope === 'org')).toBe(true);
      });

      it('filters by include IDs', () => {
        const context = createContext({
          isPlatformAdmin: true,
          memberships: [],
        });
        
        const items = getVisibleNavItems(context, {
          includeIds: ['home', 'myAccount'],
        });
        expect(items).toHaveLength(2);
        expect(items.map(i => i.id)).toEqual(['home', 'myAccount']);
      });

      it('filters by exclude IDs', () => {
        const context = createContext({
          isPlatformAdmin: true,
          memberships: [],
        });
        
        const allItems = getVisibleNavItems(context);
        const filteredItems = getVisibleNavItems(context, {
          excludeIds: ['home', 'myAccount'],
        });
        
        expect(filteredItems.find(i => i.id === 'home')).toBeUndefined();
        expect(filteredItems.find(i => i.id === 'myAccount')).toBeUndefined();
        expect(filteredItems.length).toBe(allItems.length - 2);
      });
    });

    it('sorts items by order', () => {
      const context = createContext({
        isPlatformAdmin: true,
        memberships: [],
        activeOrgId: 'org-1',
      });
      const items = getVisibleNavItems(context);
      
      for (let i = 1; i < items.length; i++) {
        expect(items[i].order).toBeGreaterThanOrEqual(items[i - 1].order);
      }
    });
  });

  describe('getResolvedNavItem', () => {
    it('resolves home path based on role (regular member)', () => {
      const context = createContext({ memberships: [] });
      const homeItem = navItems.find(i => i.id === 'home')!;
      const resolved = getResolvedNavItem(homeItem, context);
      expect(resolved.resolvedPath).toBe('/me/home');
    });

    it('resolves home path based on role (OrgAdmin)', () => {
      const context = createContext({
        memberships: [createMembership({ role: 'OrgAdmin' })],
      });
      const homeItem = navItems.find(i => i.id === 'home')!;
      const resolved = getResolvedNavItem(homeItem, context);
      expect(resolved.resolvedPath).toBe('/admin');
    });

    it('resolves home path based on role (PlatformAdmin)', () => {
      const context = createContext({
        isPlatformAdmin: true,
        memberships: [],
      });
      const homeItem = navItems.find(i => i.id === 'home')!;
      const resolved = getResolvedNavItem(homeItem, context);
      expect(resolved.resolvedPath).toBe('/platform-admin/dashboard');
    });

    it('resolves home path based on active org role (OrgAdmin with Member org active)', () => {
      const context = createContext({
        memberships: [
          createMembership({ role: 'OrgAdmin', organizationId: 'org-1' }),
          createMembership({ role: 'Member', organizationId: 'org-2' }),
        ],
        activeOrgId: 'org-2',
        activeOrgRole: 'Member',
      });
      const homeItem = navItems.find(i => i.id === 'home')!;
      const resolved = getResolvedNavItem(homeItem, context);
      expect(resolved.resolvedPath).toBe('/me/home');
    });

    it('resolves home path based on active org role (OrgAdmin with admin org active)', () => {
      const context = createContext({
        memberships: [
          createMembership({ role: 'OrgAdmin', organizationId: 'org-1' }),
          createMembership({ role: 'Member', organizationId: 'org-2' }),
        ],
        activeOrgId: 'org-1',
        activeOrgRole: 'OrgAdmin',
      });
      const homeItem = navItems.find(i => i.id === 'home')!;
      const resolved = getResolvedNavItem(homeItem, context);
      expect(resolved.resolvedPath).toBe('/admin');
    });

    it('resolves org-scoped paths with active org ID', () => {
      const context = createContext({
        isPlatformAdmin: true,
        memberships: [],
        activeOrgId: 'org-abc',
      });
      const membershipItem = navItems.find(i => i.id === 'manageMemberships')!;
      const resolved = getResolvedNavItem(membershipItem, context);
      expect(resolved.resolvedPath).toBe('/admin/organizations/org-abc/memberships');
    });
  });

  describe('navItems structure', () => {
    it('has all required core items', () => {
      const requiredIds = [
        'home',
        'myAccount',
        'myOrganizations',
        'platformDashboard',
        'adminDashboard',
        'manageUsers',
        'manageOrganizations',
        'manageMemberships',
      ];
      
      for (const id of requiredIds) {
        expect(navItems.find(i => i.id === id)).toBeDefined();
      }
    });

    it('all items have valid scope', () => {
      for (const item of navItems) {
        expect(['global', 'org', 'user', undefined]).toContain(item.scope);
      }
    });

    it('all items have unique IDs', () => {
      const ids = navItems.map(i => i.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });
});
