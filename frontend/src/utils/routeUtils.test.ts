import { describe, it, expect } from 'vitest';
import { getDefaultRouteForUser, isPlatformAdmin } from './routeUtils';
import type { LoginResponse, MembershipWithOrganizationDto } from '../types/api';

describe('routeUtils', () => {
  const createUser = (role: 'User' | 'Admin'): LoginResponse => ({
    token: 'test-token',
    userId: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    role,
  });

  const createMembership = (role: 'OrgAdmin' | 'Member'): MembershipWithOrganizationDto => ({
    id: 'membership-1',
    organizationId: 'org-1',
    organizationName: 'Test Org',
    userId: 'user-123',
    role,
    createdAt: '2024-01-01T00:00:00Z',
  });

  describe('isPlatformAdmin', () => {
    it('returns false when user is null', () => {
      expect(isPlatformAdmin(null)).toBe(false);
    });

    it('returns true for users with Admin role', () => {
      const adminUser = createUser('Admin');
      expect(isPlatformAdmin(adminUser)).toBe(true);
    });

    it('returns false for users with User role', () => {
      const regularUser = createUser('User');
      expect(isPlatformAdmin(regularUser)).toBe(false);
    });
  });

  describe('getDefaultRouteForUser', () => {
    it('returns /login when user is null', () => {
      const result = getDefaultRouteForUser(null);
      expect(result).toBe('/login');
    });

    it('returns /platform-admin/dashboard for platform admin users', () => {
      const adminUser = createUser('Admin');
      const result = getDefaultRouteForUser(adminUser);
      expect(result).toBe('/platform-admin/dashboard');
    });

    it('returns /platform-admin/dashboard for platform admin regardless of memberships', () => {
      const adminUser = createUser('Admin');
      const memberships = [createMembership('Member')];
      const result = getDefaultRouteForUser(adminUser, memberships);
      expect(result).toBe('/platform-admin/dashboard');
    });

    it('returns /admin for non-admin users who are OrgAdmin', () => {
      const regularUser = createUser('User');
      const memberships = [createMembership('OrgAdmin')];
      const result = getDefaultRouteForUser(regularUser, memberships);
      expect(result).toBe('/admin');
    });

    it('returns /me/home for non-admin users who are only members', () => {
      const regularUser = createUser('User');
      const memberships = [createMembership('Member')];
      const result = getDefaultRouteForUser(regularUser, memberships);
      expect(result).toBe('/me/home');
    });

    it('returns /me/home for non-admin users with no memberships', () => {
      const regularUser = createUser('User');
      const result = getDefaultRouteForUser(regularUser, []);
      expect(result).toBe('/me/home');
    });

    it('returns /me/home for non-admin users when memberships is undefined', () => {
      const regularUser = createUser('User');
      const result = getDefaultRouteForUser(regularUser);
      expect(result).toBe('/me/home');
    });

    it('returns /admin for user with mixed roles (at least one OrgAdmin)', () => {
      const regularUser = createUser('User');
      const memberships = [
        createMembership('Member'),
        { ...createMembership('OrgAdmin'), organizationId: 'org-2' },
      ];
      const result = getDefaultRouteForUser(regularUser, memberships);
      expect(result).toBe('/admin');
    });
  });
});
