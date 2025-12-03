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
 * Get styling for outcome badges
 */
export const getOutcomeBadgeStyle = (outcome: AuditOutcome): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: 500,
    display: 'inline-block',
  };

  switch (outcome) {
    case 'Success':
      return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
    case 'Failure':
      return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
    case 'Denied':
      return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
    case 'Partial':
      return { ...baseStyle, backgroundColor: '#d1ecf1', color: '#0c5460' };
    default:
      return { ...baseStyle, backgroundColor: '#e9ecef', color: '#495057' };
  }
};

/**
 * Get styling for action type badges
 */
export const getActionBadgeStyle = (actionType: AuditActionType): React.CSSProperties => {
  const baseStyle: React.CSSProperties = {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 500,
    display: 'inline-block',
  };

  if (actionType === 'Created') {
    return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
  } else if (actionType === 'Updated') {
    return { ...baseStyle, backgroundColor: '#d1ecf1', color: '#0c5460' };
  } else if (actionType === 'Deleted') {
    return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
  } else if (actionType === 'AuthorizationDenied') {
    return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
  } else {
    return { ...baseStyle, backgroundColor: '#e9ecef', color: '#495057' };
  }
};

/**
 * Format date string to localized string
 */
export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
};
