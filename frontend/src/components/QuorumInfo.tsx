import React from 'react';

interface QuorumInfoProps {
  quorumRequirement?: number;
  quorumMet?: boolean;
  totalVotesCast?: number;
  eligibleVotingPowerSnapshot?: number;
  eligibleVotingPower?: number;
  style?: React.CSSProperties;
}

/**
 * Displays quorum information for a proposal
 */
export const QuorumInfo: React.FC<QuorumInfoProps> = ({
  quorumRequirement,
  quorumMet,
  totalVotesCast,
  eligibleVotingPowerSnapshot,
  eligibleVotingPower,
  style,
}) => {
  if (quorumRequirement === undefined || quorumRequirement === null) {
    return (
      <div style={{ fontSize: '0.875rem', color: '#6c757d', ...style }}>
        No quorum requirement
      </div>
    );
  }

  const eligiblePower = eligibleVotingPowerSnapshot || eligibleVotingPower;
  const requiredVotes = eligiblePower ? (eligiblePower * quorumRequirement) / 100 : null;

  return (
    <div style={{ fontSize: '0.875rem', ...style }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <strong>Quorum Requirement:</strong> {quorumRequirement}% of eligible voting power
      </div>
      
      {eligiblePower !== undefined && eligiblePower !== null && (
        <div style={{ marginBottom: '0.5rem', color: '#6c757d' }}>
          <strong>Eligible Voting Power:</strong> {eligiblePower.toFixed(2)}
        </div>
      )}
      
      {requiredVotes !== null && (
        <div style={{ marginBottom: '0.5rem', color: '#6c757d' }}>
          <strong>Required Votes:</strong> {requiredVotes.toFixed(2)}
        </div>
      )}
      
      {totalVotesCast !== undefined && totalVotesCast !== null && (
        <div style={{ marginBottom: '0.5rem', color: '#6c757d' }}>
          <strong>Total Votes Cast:</strong> {totalVotesCast.toFixed(2)}
        </div>
      )}
      
      {quorumMet !== undefined && quorumMet !== null && (
        <div
          style={{
            padding: '0.5rem',
            borderRadius: '4px',
            backgroundColor: quorumMet ? '#d4edda' : '#f8d7da',
            color: quorumMet ? '#155724' : '#721c24',
            fontWeight: 'bold',
            marginTop: '0.5rem',
          }}
        >
          {quorumMet ? '✓ Quorum Met' : '✗ Quorum Not Met'}
        </div>
      )}
    </div>
  );
};
