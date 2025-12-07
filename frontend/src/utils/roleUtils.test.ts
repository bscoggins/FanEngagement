import { describe, it, expect } from 'vitest';
import { getRoleBadgeClass, getRoleLabel, getRoleFullName } from './roleUtils';

describe('roleUtils', () => {
  describe('getRoleBadgeClass', () => {
    it('returns "admin" for OrgAdmin role', () => {
      expect(getRoleBadgeClass('OrgAdmin')).toBe('admin');
    });

    it('returns "member" for Member role', () => {
      expect(getRoleBadgeClass('Member')).toBe('member');
    });
  });

  describe('getRoleLabel', () => {
    it('returns "Admin" for OrgAdmin role', () => {
      expect(getRoleLabel('OrgAdmin')).toBe('Admin');
    });

    it('returns "Member" for Member role', () => {
      expect(getRoleLabel('Member')).toBe('Member');
    });
  });

  describe('getRoleFullName', () => {
    it('returns "Org Admin" for OrgAdmin role', () => {
      expect(getRoleFullName('OrgAdmin')).toBe('Org Admin');
    });

    it('returns "Member" for Member role', () => {
      expect(getRoleFullName('Member')).toBe('Member');
    });
  });
});
