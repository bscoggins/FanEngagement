import React from 'react';
import type { ProposalStatus } from '../types/api';
import { getStatusBadgeColor, getStatusLabel } from '../utils/proposalUtils';

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
  style?: React.CSSProperties;
}

/**
 * Displays a colored badge for proposal status
 */
export const ProposalStatusBadge: React.FC<ProposalStatusBadgeProps> = ({ status, style }) => {
  return (
    <span
      style={{
        padding: '0.25rem 0.75rem',
        backgroundColor: getStatusBadgeColor(status),
        color: 'white',
        borderRadius: '4px',
        fontSize: '0.875rem',
        fontWeight: 'bold',
        ...style,
      }}
    >
      {getStatusLabel(status)}
    </span>
  );
};
