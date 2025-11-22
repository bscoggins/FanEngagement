import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IfGlobalAdmin, IfOrgAdmin, IfOrgMember } from './PermissionWrappers';
import { usePermissions } from '../hooks/usePermissions';

// Mock the usePermissions hook
vi.mock('../hooks/usePermissions');

describe('PermissionWrappers', () => {
  describe('IfGlobalAdmin', () => {
    it('should render children when user is GlobalAdmin', () => {
      vi.mocked(usePermissions).mockReturnValue({
        isGlobalAdmin: () => true,
        isOrgAdmin: () => false,
        isOrgMember: () => false,
        memberships: [],
        isLoading: false,
        refreshMemberships: vi.fn(),
      });

      render(
        <IfGlobalAdmin>
          <div>Admin Content</div>
        </IfGlobalAdmin>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should not render children when user is not GlobalAdmin', () => {
      vi.mocked(usePermissions).mockReturnValue({
        isGlobalAdmin: () => false,
        isOrgAdmin: () => false,
        isOrgMember: () => false,
        memberships: [],
        isLoading: false,
        refreshMemberships: vi.fn(),
      });

      render(
        <IfGlobalAdmin>
          <div>Admin Content</div>
        </IfGlobalAdmin>
      );

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('IfOrgAdmin', () => {
    it('should render children when user is OrgAdmin', () => {
      vi.mocked(usePermissions).mockReturnValue({
        isGlobalAdmin: () => false,
        isOrgAdmin: (orgId: string) => orgId === 'org-1',
        isOrgMember: () => false,
        memberships: [],
        isLoading: false,
        refreshMemberships: vi.fn(),
      });

      render(
        <IfOrgAdmin orgId="org-1">
          <div>Org Admin Content</div>
        </IfOrgAdmin>
      );

      expect(screen.getByText('Org Admin Content')).toBeInTheDocument();
    });

    it('should not render children when user is not OrgAdmin', () => {
      vi.mocked(usePermissions).mockReturnValue({
        isGlobalAdmin: () => false,
        isOrgAdmin: (orgId: string) => orgId === 'org-1',
        isOrgMember: () => false,
        memberships: [],
        isLoading: false,
        refreshMemberships: vi.fn(),
      });

      render(
        <IfOrgAdmin orgId="org-2">
          <div>Org Admin Content</div>
        </IfOrgAdmin>
      );

      expect(screen.queryByText('Org Admin Content')).not.toBeInTheDocument();
    });

    it('should render children for GlobalAdmin even without org membership', () => {
      vi.mocked(usePermissions).mockReturnValue({
        isGlobalAdmin: () => true,
        isOrgAdmin: () => true, // GlobalAdmins return true for all orgs
        isOrgMember: () => true,
        memberships: [],
        isLoading: false,
        refreshMemberships: vi.fn(),
      });

      render(
        <IfOrgAdmin orgId="any-org">
          <div>Org Admin Content</div>
        </IfOrgAdmin>
      );

      expect(screen.getByText('Org Admin Content')).toBeInTheDocument();
    });
  });

  describe('IfOrgMember', () => {
    it('should render children when user is OrgMember', () => {
      vi.mocked(usePermissions).mockReturnValue({
        isGlobalAdmin: () => false,
        isOrgAdmin: () => false,
        isOrgMember: (orgId: string) => orgId === 'org-1',
        memberships: [],
        isLoading: false,
        refreshMemberships: vi.fn(),
      });

      render(
        <IfOrgMember orgId="org-1">
          <div>Member Content</div>
        </IfOrgMember>
      );

      expect(screen.getByText('Member Content')).toBeInTheDocument();
    });

    it('should not render children when user is not OrgMember', () => {
      vi.mocked(usePermissions).mockReturnValue({
        isGlobalAdmin: () => false,
        isOrgAdmin: () => false,
        isOrgMember: (orgId: string) => orgId === 'org-1',
        memberships: [],
        isLoading: false,
        refreshMemberships: vi.fn(),
      });

      render(
        <IfOrgMember orgId="org-2">
          <div>Member Content</div>
        </IfOrgMember>
      );

      expect(screen.queryByText('Member Content')).not.toBeInTheDocument();
    });

    it('should render children for GlobalAdmin even without org membership', () => {
      vi.mocked(usePermissions).mockReturnValue({
        isGlobalAdmin: () => true,
        isOrgAdmin: () => true,
        isOrgMember: () => true, // GlobalAdmins return true for all orgs
        memberships: [],
        isLoading: false,
        refreshMemberships: vi.fn(),
      });

      render(
        <IfOrgMember orgId="any-org">
          <div>Member Content</div>
        </IfOrgMember>
      );

      expect(screen.getByText('Member Content')).toBeInTheDocument();
    });
  });
});
