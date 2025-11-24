import React from 'react';
import type { ProposalStatus } from '../types/api';
import { getProposalTimingMessage } from '../utils/proposalUtils';

interface ProposalTimingInfoProps {
  status: ProposalStatus;
  startAt?: string;
  endAt?: string;
  style?: React.CSSProperties;
}

/**
 * Displays timing information for a proposal with relative time
 */
export const ProposalTimingInfo: React.FC<ProposalTimingInfoProps> = ({
  status,
  startAt,
  endAt,
  style,
}) => {
  const message = getProposalTimingMessage(status, startAt, endAt);

  if (!message) {
    return null;
  }

  // Color based on status
  let color = '#6c757d'; // default gray
  if (status === 'Open') {
    color = '#28a745'; // green for active
  } else if (status === 'Closed' || status === 'Finalized') {
    color = '#dc3545'; // red for closed
  }

  return (
    <div
      style={{
        fontSize: '0.875rem',
        color: color,
        fontWeight: 500,
        ...style,
      }}
    >
      {message}
    </div>
  );
};
