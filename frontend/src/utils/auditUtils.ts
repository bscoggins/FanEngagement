import type { AuditActionType, AuditResourceType, AuditOutcome } from '../types/api';

/**
 * All available audit action types
 */
export const ACTION_TYPES: AuditActionType[] = [
  'Created',
  'Updated',
  'Deleted',
  'Accessed',
  'Exported',
  'StatusChanged',
  'RoleChanged',
  'Authenticated',
  'AuthorizationDenied',
  'AdminDataSeeded',
  'AdminDataReset',
  'AdminDataCleanup',
];

/**
 * All available audit resource types
 */
export const RESOURCE_TYPES: AuditResourceType[] = [
  'User',
  'Organization',
  'Membership',
  'ShareType',
  'ShareIssuance',
  'ShareBalance',
  'Proposal',
  'ProposalOption',
  'Vote',
  'WebhookEndpoint',
  'OutboundEvent',
  'AuditEvent',
  'SystemConfiguration',
];

/**
 * Get class names for outcome badges with theme-aware styling
 */
export const getOutcomeBadgeClass = (outcome: AuditOutcome): string => {
  switch (outcome) {
    case 'Success':
      return 'admin-badge admin-badge--success';
    case 'Failure':
      return 'admin-badge admin-badge--danger';
    case 'Denied':
      return 'admin-badge admin-badge--warning';
    case 'Partial':
      return 'admin-badge admin-badge--info';
    default:
      return 'admin-badge admin-badge--muted';
  }
};

/**
 * Get class names for action type badges
 */
export const getActionBadgeClass = (actionType: AuditActionType): string => {
  switch (actionType) {
    case 'Created':
      return 'admin-badge admin-badge--success';
    case 'Updated':
    case 'AdminDataSeeded':
    case 'AdminDataReset':
    case 'AdminDataCleanup':
      return 'admin-badge admin-badge--info';
    case 'Deleted':
      return 'admin-badge admin-badge--danger';
    case 'AuthorizationDenied':
      return 'admin-badge admin-badge--warning';
    default:
      return 'admin-badge admin-badge--muted';
  }
};

/**
 * Format date string to localized string
 */
export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
};
