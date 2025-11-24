import type { ProposalStatus, ShareBalance, ShareType } from '../types/api';

/**
 * Calculate voting power from share balances and share types.
 * VotingPower = Sum(Balance × VotingWeight)
 * @param balances Array of ShareBalance objects
 * @param shareTypes Array of ShareType objects (must include votingWeight)
 * @returns Total voting power
 */
export function calculateVotingPower(
  balances: ShareBalance[],
  shareTypes: ShareType[]
): number {
  // Build a map of shareTypeId to votingWeight for quick lookup
  const votingWeightMap: Record<string, number> = {};
  for (const type of shareTypes) {
    votingWeightMap[type.id] = type.votingWeight ?? 1;
  }
  // Sum balance × votingWeight for each balance
  return balances.reduce((sum, balance) => {
    const weight = votingWeightMap[balance.shareTypeId] ?? 1;
    return sum + balance.balance * weight;
  }, 0);
}

/**
 * Format a relative time string (e.g., "in 2 hours", "2 days ago")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const isPast = diffMs < 0;

  if (diffSec < 60) {
    return isPast ? 'just now' : 'in a moment';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    const unit = diffMin === 1 ? 'minute' : 'minutes';
    return isPast ? `${diffMin} ${unit} ago` : `in ${diffMin} ${unit}`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    const unit = diffHour === 1 ? 'hour' : 'hours';
    return isPast ? `${diffHour} ${unit} ago` : `in ${diffHour} ${unit}`;
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) {
    const unit = diffDay === 1 ? 'day' : 'days';
    return isPast ? `${diffDay} ${unit} ago` : `in ${diffDay} ${unit}`;
  }

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) {
    const unit = diffWeek === 1 ? 'week' : 'weeks';
    return isPast ? `${diffWeek} ${unit} ago` : `in ${diffWeek} ${unit}`;
  }

  const diffMonth = Math.floor(diffDay / 30);
  const unit = diffMonth === 1 ? 'month' : 'months';
  return isPast ? `${diffMonth} ${unit} ago` : `in ${diffMonth} ${unit}`;
}

/**
 * Check if a proposal is currently open for voting based on timing
 */
export function isProposalOpenForVoting(
  status: ProposalStatus,
  startAt?: string,
  endAt?: string
): boolean {
  if (status !== 'Open') {
    return false;
  }

  const now = new Date();

  if (startAt) {
    const start = new Date(startAt);
    if (now < start) {
      return false; // Not yet started
    }
  }

  if (endAt) {
    const end = new Date(endAt);
    if (now >= end) {
      return false; // Already ended
    }
  }

  return true;
}

/**
 * Get a human-readable timing message for a proposal
 */
export function getProposalTimingMessage(
  status: ProposalStatus,
  startAt?: string,
  endAt?: string
): string | null {
  const now = new Date();

  if (status === 'Draft') {
    if (startAt) {
      const start = new Date(startAt);
      if (now < start) {
        return `Will open ${formatRelativeTime(startAt)}`;
      }
    }
    return null;
  }

  if (status === 'Open') {
    if (startAt) {
      const start = new Date(startAt);
      if (now < start) {
        return `Opens ${formatRelativeTime(startAt)}`;
      }
    }
    
    if (endAt) {
      const end = new Date(endAt);
      if (now < end) {
        return `Closes ${formatRelativeTime(endAt)}`;
      } else {
        return 'Voting period ended';
      }
    }
    
    return 'Currently accepting votes';
  }

  if (status === 'Closed' || status === 'Finalized') {
    if (endAt) {
      return `Closed ${formatRelativeTime(endAt)}`;
    }
    return 'Voting closed';
  }

  return null;
}

/**
 * Check if user is eligible to vote on a proposal
 * Returns { eligible, reason }
 */
export function checkVotingEligibility(
  status: ProposalStatus,
  startAt: string | undefined,
  endAt: string | undefined,
  hasVoted: boolean,
  votingPower: number
): { eligible: boolean; reason?: string } {
  // Must be Open status
  if (status !== 'Open') {
    return {
      eligible: false,
      reason: `Voting is only allowed on Open proposals. This proposal is ${status}.`,
    };
  }

  // Check timing
  const now = new Date();
  
  if (startAt) {
    const start = new Date(startAt);
    if (now < start) {
      return {
        eligible: false,
        reason: `Voting has not started yet. Opens ${formatRelativeTime(startAt)}.`,
      };
    }
  }

  if (endAt) {
    const end = new Date(endAt);
    if (now >= end) {
      return {
        eligible: false,
        reason: 'Voting period has ended.',
      };
    }
  }

  // Check if already voted
  if (hasVoted) {
    return {
      eligible: false,
      reason: 'You have already cast your vote on this proposal.',
    };
  }

  // Check voting power
  if (votingPower <= 0) {
    return {
      eligible: false,
      reason: 'You do not have any voting power in this organization.',
    };
  }

  return { eligible: true };
}

/**
 * Get status badge color for a proposal status
 */
export function getStatusBadgeColor(status: ProposalStatus): string {
  switch (status) {
    case 'Draft':
      return '#6c757d';
    case 'Open':
      return '#28a745';
    case 'Closed':
      return '#dc3545';
    case 'Finalized':
      return '#007bff';
    default:
      return '#6c757d';
  }
}

/**
 * Get a descriptive label for a proposal status
 */
export function getStatusLabel(status: ProposalStatus): string {
  switch (status) {
    case 'Draft':
      return 'Draft';
    case 'Open':
      return 'Open';
    case 'Closed':
      return 'Closed';
    case 'Finalized':
      return 'Finalized';
    default:
      return status;
  }
}
