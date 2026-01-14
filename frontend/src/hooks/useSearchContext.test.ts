import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSearchContext } from './useSearchContext';
import { MEMBERS_CAN_SEARCH_MEMBERS } from '../search/searchConfig';

// Mock the auth context
const mockUseAuth = vi.fn();
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the org context
const mockUseActiveOrganization = vi.fn();
vi.mock('../contexts/OrgContext', () => ({
  useActiveOrganization: () => mockUseActiveOrganization(),
}));

describe('useSearchContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('unauthenticated user', () => {
    it('returns empty resources when not authenticated', () => {
      mockUseAuth.mockReturnValue({ isAdmin: false, isAuthenticated: false });
      mockUseActiveOrganization.mockReturnValue({ activeOrg: null });

      const { result } = renderHook(() => useSearchContext());

      expect(result.current.resources).toEqual([]);
      expect(result.current.routeMode).toBe('member');
      expect(result.current.placeholder).toBe('Search...');
    });
  });

  describe('Platform Admin', () => {
    it('returns users, organizations, and proposals for platform admin', () => {
      mockUseAuth.mockReturnValue({ isAdmin: true, isAuthenticated: true });
      mockUseActiveOrganization.mockReturnValue({ activeOrg: null });

      const { result } = renderHook(() => useSearchContext());

      expect(result.current.resources).toEqual(['users', 'organizations', 'proposals']);
      expect(result.current.routeMode).toBe('platformAdmin');
      expect(result.current.placeholder).toBe('Search users, organizations, proposals...');
      expect(result.current.organizationId).toBeUndefined();
    });

    it('ignores active org for platform admin (always searches all)', () => {
      mockUseAuth.mockReturnValue({ isAdmin: true, isAuthenticated: true });
      mockUseActiveOrganization.mockReturnValue({
        activeOrg: { id: 'org-1', name: 'Test Org', role: 'OrgAdmin' },
      });

      const { result } = renderHook(() => useSearchContext());

      expect(result.current.resources).toEqual(['users', 'organizations', 'proposals']);
      expect(result.current.routeMode).toBe('platformAdmin');
      // Platform admin doesn't scope to org
      expect(result.current.organizationId).toBeUndefined();
    });
  });

  describe('Org Admin', () => {
    it('returns organizations and proposals when no active org', () => {
      mockUseAuth.mockReturnValue({ isAdmin: false, isAuthenticated: true });
      mockUseActiveOrganization.mockReturnValue({ activeOrg: null });

      const { result } = renderHook(() => useSearchContext());

      expect(result.current.resources).toEqual(['organizations', 'proposals']);
      expect(result.current.routeMode).toBe('member');
      expect(result.current.placeholder).toBe('Search organizations, proposals...');
    });

    it('returns full resource set for OrgAdmin with active org', () => {
      mockUseAuth.mockReturnValue({ isAdmin: false, isAuthenticated: true });
      mockUseActiveOrganization.mockReturnValue({
        activeOrg: { id: 'org-123', name: 'Tech Innovators', role: 'OrgAdmin' },
      });

      const { result } = renderHook(() => useSearchContext());

      expect(result.current.resources).toEqual([
        'organizations',
        'proposals',
        'members',
        'shareTypes',
      ]);
      expect(result.current.routeMode).toBe('orgAdmin');
      expect(result.current.organizationId).toBe('org-123');
      expect(result.current.organizationName).toBe('Tech Innovators');
    });
  });

  describe('Regular Member', () => {
    it('returns organizations and proposals when no active org', () => {
      mockUseAuth.mockReturnValue({ isAdmin: false, isAuthenticated: true });
      mockUseActiveOrganization.mockReturnValue({ activeOrg: null });

      const { result } = renderHook(() => useSearchContext());

      expect(result.current.resources).toEqual(['organizations', 'proposals']);
      expect(result.current.routeMode).toBe('member');
    });

    it('returns member resources with active org', () => {
      mockUseAuth.mockReturnValue({ isAdmin: false, isAuthenticated: true });
      mockUseActiveOrganization.mockReturnValue({
        activeOrg: { id: 'org-456', name: 'Sports Club', role: 'Member' },
      });

      const { result } = renderHook(() => useSearchContext());

      expect(result.current.routeMode).toBe('member');
      expect(result.current.organizationId).toBe('org-456');
      expect(result.current.organizationName).toBe('Sports Club');
      expect(result.current.resources).toContain('organizations');
      expect(result.current.resources).toContain('proposals');
      
      // Member search depends on MEMBERS_CAN_SEARCH_MEMBERS feature flag (currently false).
      // This test covers both branches to ensure correct behavior when the flag is toggled.
      if (MEMBERS_CAN_SEARCH_MEMBERS) {
        expect(result.current.resources).toContain('members');
      } else {
        expect(result.current.resources).not.toContain('members');
      }
      
      // Members don't see share types
      expect(result.current.resources).not.toContain('shareTypes');
    });
  });

  describe('placeholder text', () => {
    it('generates appropriate placeholder for org context', () => {
      mockUseAuth.mockReturnValue({ isAdmin: false, isAuthenticated: true });
      mockUseActiveOrganization.mockReturnValue({
        activeOrg: { id: 'org-1', name: 'My Org', role: 'OrgAdmin' },
      });

      const { result } = renderHook(() => useSearchContext());

      // Should include resource names but not "organizations" since we're in org context
      expect(result.current.placeholder).toContain('proposals');
      expect(result.current.placeholder).toContain('members');
    });
  });
});
