import React from 'react';
import type { ProposalStatus } from '../types/api';
import { getStatusLabel } from '../utils/proposalUtils';
import { Badge, type BadgeVariant } from './Badge';

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Displays a colored badge for proposal status using the Badge component
 */
export const ProposalStatusBadge: React.FC<ProposalStatusBadgeProps> = ({ 
  status, 
  style, 
  className 
}) => {
  // Map proposal status to badge variant
  const getVariant = (status: ProposalStatus): BadgeVariant => {
    switch (status) {
      case 'Draft':
        return 'neutral';
      case 'Open':
        return 'success';
      case 'Closed':
        return 'error';
      case 'Finalized':
        return 'default';
      default:
        return 'neutral';
    }
  };

  return (
    <span style={style} className={className}>
      <Badge variant={getVariant(status)}>
        {getStatusLabel(status)}
      </Badge>
    </span>
  );
};
