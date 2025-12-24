import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { proposalsApi } from '../api/proposalsApi';
import { shareBalancesApi } from '../api/shareBalancesApi';
import { shareTypesApi } from '../api/shareTypesApi';
import { ProposalStatusBadge } from '../components/ProposalStatusBadge';
import { ProposalTimingInfo } from '../components/ProposalTimingInfo';
import { QuorumInfo } from '../components/QuorumInfo';
import { checkVotingEligibility, calculateVotingPower } from '../utils/proposalUtils';
import { parseApiError } from '../utils/errorUtils';
import type { ProposalDetails, Vote, ProposalResults, ShareBalance, ShareType } from '../types/api';
import { Radio } from '../components/Radio';
import { Button } from '../components/Button';
import { useNotifications } from '../contexts/NotificationContext';

const mergeResultsWithOptions = (
  resultsData: ProposalResults | null,
  proposalData: ProposalDetails | null
): ProposalResults | null => {
  if (!proposalData) return resultsData;

  const optionResults = proposalData.options.map((option) => {
    const existing = resultsData?.optionResults.find((o) => o.optionId === option.id);
    return (
      existing ?? {
        optionId: option.id,
        optionText: option.text,
        voteCount: 0,
        totalVotingPower: 0,
      }
    );
  });

  return {
    proposalId: resultsData?.proposalId ?? proposalData.id,
    optionResults,
    totalVotingPower: optionResults.reduce((sum, result) => sum + result.totalVotingPower, 0),
  };
};

export const MyProposalPage: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const { user } = useAuth();
  const { showError, showSuccess } = useNotifications();
  const [proposal, setProposal] = useState<ProposalDetails | null>(null);
  const [userVote, setUserVote] = useState<Vote | null>(null);
  const [results, setResults] = useState<ProposalResults | null>(null);
  const [balances, setBalances] = useState<ShareBalance[]>([]);
  const [shareTypes, setShareTypes] = useState<ShareType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [refreshWarning, setRefreshWarning] = useState<string>('');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const optimisticVoteCounter = useRef(0);

  const generateOptimisticVoteId = useCallback(() => {
    if (typeof crypto !== 'undefined') {
      if (typeof crypto.randomUUID === 'function') {
        try {
          return crypto.randomUUID();
        } catch {
          // Handle environments where randomUUID is unsupported or restricted by CSP
        }
      }

      if (typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `temp-vote-${hex}`;
      }
    }

    optimisticVoteCounter.current += 1;
    const timestamp = Date.now();
    const randomPart =
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    return `temp-vote-${timestamp}-${optimisticVoteCounter.current}-${randomPart}`;
  }, []);
  const userVotingPower = useMemo(
    () => calculateVotingPower(balances, shareTypes),
    [balances, shareTypes]
  );

  useEffect(() => {
    if (!proposalId || !user?.userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const proposalData = await proposalsApi.getById(proposalId);
        setProposal(proposalData);

        // Fetch share types and user's share balances to calculate voting power
        try {
          const [balanceData, shareTypeData] = await Promise.all([
            shareBalancesApi.getBalances(proposalData.organizationId, user.userId),
            shareTypesApi.getByOrganization(proposalData.organizationId),
          ]);
          setBalances(balanceData);
          setShareTypes(shareTypeData);
        } catch (err) {
          console.error('Failed to fetch balances or share types:', err);
        }

        // Try to get user's vote
        try {
          const voteData = await proposalsApi.getUserVote(proposalId, user.userId);
          setUserVote(voteData);
        } catch (err: any) {
          // 404 means user hasn't voted yet, which is fine
          if (err.response?.status !== 404) {
            console.error('Failed to fetch user vote:', err);
          }
        }

        // Get results if proposal is Open, Closed, or Finalized (per architecture docs)
        if (
          proposalData.status === 'Open' ||
          proposalData.status === 'Closed' ||
          proposalData.status === 'Finalized'
        ) {
          try {
            const resultsData = await proposalsApi.getResults(proposalId);
            setResults(mergeResultsWithOptions(resultsData, proposalData));
          } catch (err) {
            console.error('Failed to fetch results:', err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch proposal:', err);
        setError('Failed to load proposal information.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [proposalId, user?.userId]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalId || !user?.userId || !selectedOptionId || !proposal) return;
    if (submitting) return;

    setSubmitting(true);
    const previousResults = results;
    const previousUserVote = userVote;
    const previousSelection = selectedOptionId;
    // Note: userVotingPower is derived from the currently loaded balances/shareTypes.
    // If balances/shareTypes are stale, this comparison is a best-effort signal only.
    const votingPowerChanged =
      previousUserVote != null && previousUserVote.votingPower !== userVotingPower;

    const resultsSnapshot =
      mergeResultsWithOptions(results, proposal) ?? {
        proposalId,
        optionResults: [],
        totalVotingPower: 0,
      };

    const normalizedOptionResults = resultsSnapshot.optionResults;

    const isRevotingSameOption =
      previousUserVote != null && previousUserVote.proposalOptionId === selectedOptionId;

    const optimisticOptionResults = normalizedOptionResults.map((optionResult) => {
      let voteCount = optionResult.voteCount;
      let totalVotingPower = optionResult.totalVotingPower;

      if (isRevotingSameOption && optionResult.optionId === selectedOptionId) {
        const powerDelta = userVotingPower - (previousUserVote?.votingPower ?? 0);
        totalVotingPower += powerDelta;
      } else {
        if (previousUserVote?.proposalOptionId === optionResult.optionId) {
          voteCount = Math.max(0, voteCount - 1);
          totalVotingPower = Math.max(0, totalVotingPower - previousUserVote.votingPower);
        }

        if (optionResult.optionId === selectedOptionId) {
          voteCount += 1;
          totalVotingPower += userVotingPower;
        }
      }

      return {
        ...optionResult,
        voteCount,
        totalVotingPower,
      };
    });

    const optimisticResults: ProposalResults = {
      ...resultsSnapshot,
      optionResults: optimisticOptionResults,
      totalVotingPower: optimisticOptionResults.reduce(
        (sum, optionResult) => sum + optionResult.totalVotingPower,
        0
      ),
    };

    const optimisticVoteId = generateOptimisticVoteId();

    const optimisticVote: Vote = {
      id: optimisticVoteId,
      proposalId,
      proposalOptionId: selectedOptionId,
      userId: user.userId,
      votingPower: userVotingPower,
      castAt: new Date().toISOString(),
    };

    try {
      setError('');
      setRefreshWarning('');
      setSuccessMessage('');

      if (votingPowerChanged) {
        const powerChangeWarning =
          'Your voting power changed since your last vote. Totals will refresh after the latest results load.';
        setRefreshWarning(powerChangeWarning);
      }

      if (userVotingPower > 0) {
        setResults(optimisticResults);
        setUserVote(optimisticVote);
        setSuccessMessage('Casting your vote...');
      } else {
        const noPowerMessage = 'You do not have any voting power for this proposal.';
        // Store the error state and surface the toast so the user sees immediate feedback.
        setError(noPowerMessage);
        showError(noPowerMessage);
        setSubmitting(false);
        return;
      }

      const vote = await proposalsApi.castVote(proposalId, {
        proposalOptionId: selectedOptionId,
        userId: user.userId,
      });

      setUserVote(vote);
      setSuccessMessage('Your vote has been cast successfully!');
      showSuccess('Your vote has been cast successfully!');
      
      // Refetch results to show updated vote counts
      try {
        const resultsData = await proposalsApi.getResults(proposalId);
        setResults(mergeResultsWithOptions(resultsData, proposal));
        setRefreshWarning('');
        setSelectedOptionId('');
      } catch (err) {
        console.error('Failed to fetch updated results:', err);
        setResults((current) => mergeResultsWithOptions(current ?? resultsSnapshot, proposal));
        const refreshErrorMessage =
          'Your vote was recorded, but we could not refresh the latest results. The displayed results may be out of date.';
        setRefreshWarning(refreshErrorMessage);
        setSelectedOptionId('');
        showError(refreshErrorMessage);
      }
    } catch (err: any) {
      console.error('Failed to cast vote:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      setResults(previousResults);
      setUserVote(previousUserVote);
      setSelectedOptionId(previousSelection);
      setSuccessMessage('');
      setRefreshWarning('');
      showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (error && !proposal) {
    return <div style={{ padding: '2rem', color: '#dc3545' }}>{error}</div>;
  }

  if (!proposal) {
    return <div style={{ padding: '2rem' }}>Proposal not found.</div>;
  }

  // Check eligibility
  const eligibilityCheck = checkVotingEligibility(
    proposal.status,
    proposal.startAt,
    proposal.endAt,
    !!userVote,
    userVotingPower
  );

  const showResults =
    proposal.status === 'Open' ||
    proposal.status === 'Closed' ||
    proposal.status === 'Finalized';

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <Link
        to={`/me/organizations/${proposal.organizationId}`}
        style={{
          color: '#007bff',
          textDecoration: 'none',
          marginBottom: '1rem',
          display: 'inline-block',
        }}
      >
        ← Back to Organization
      </Link>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginTop: '1rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <h1 style={{ margin: 0 }}>{proposal.title}</h1>
        <ProposalStatusBadge status={proposal.status} />
      </div>

      {proposal.description && (
        <p style={{ color: '#6c757d', marginTop: '1rem' }}>{proposal.description}</p>
      )}

      <ProposalTimingInfo
        status={proposal.status}
        startAt={proposal.startAt}
        endAt={proposal.endAt}
        style={{ marginTop: '1rem' }}
      />

      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6c757d' }}>
        {proposal.startAt && (
          <div>
            <strong>Starts:</strong> {new Date(proposal.startAt).toLocaleString()}
          </div>
        )}
        {proposal.endAt && (
          <div>
            <strong>Ends:</strong> {new Date(proposal.endAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Voting Power & Eligibility Info */}
      {proposal.status === 'Open' && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#e7f3ff',
            border: '1px solid #b3d9ff',
            borderRadius: '4px',
          }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Your Voting Power:</strong>{' '}
            {userVotingPower > 0 ? userVotingPower.toFixed(2) : '0'}
          </div>
          {!eligibilityCheck.eligible && eligibilityCheck.reason && (
            <div style={{ color: '#856404', fontSize: '0.875rem' }}>
              <strong>Note:</strong> {eligibilityCheck.reason}
            </div>
          )}
        </div>
      )}

      {refreshWarning && (
        <div
          data-testid="results-refresh-warning"
          style={{
            padding: '1rem',
            backgroundColor: '#fff3cd',
            color: '#856404',
            border: '1px solid #ffeeba',
            borderRadius: '4px',
            marginTop: '1rem',
          }}
        >
          {refreshWarning}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            marginTop: '1rem',
          }}
        >
          {successMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            marginTop: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {userVote && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#d1ecf1',
            color: '#0c5460',
            border: '1px solid #bee5eb',
            borderRadius: '4px',
            marginTop: '1rem',
          }}
        >
          <strong>You have already voted!</strong>
          <div style={{ marginTop: '0.5rem' }}>
            Your choice:{' '}
            <strong>
              {proposal.options.find((o) => o.id === userVote.proposalOptionId)?.text}
            </strong>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            Voting power: <strong>{userVote.votingPower}</strong>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            Cast at: {new Date(userVote.castAt).toLocaleString()}
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h2>Options</h2>

        {eligibilityCheck.eligible ? (
          <form onSubmit={handleVote}>
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              {proposal.options.map((option) => (
                <Radio
                  key={option.id}
                  name="option"
                  value={option.id}
                  label={option.text}
                  helperText={option.description}
                  checked={selectedOptionId === option.id}
                  onChange={(e) => setSelectedOptionId(e.target.value)}
                  disabled={submitting}
                />
              ))}
            </div>
            <Button
              type="submit"
              disabled={!selectedOptionId || submitting}
              isLoading={submitting}
              variant="primary"
              style={{ marginTop: '1rem' }}
            >
              Cast Vote
            </Button>
          </form>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            {proposal.options.map((option) => (
              <div
                key={option.id}
                style={{
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: userVote?.proposalOptionId === option.id ? '#e7f3ff' : 'white',
                }}
              >
                <strong>{option.text}</strong>
                {userVote?.proposalOptionId === option.id && (
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      color: '#007bff',
                      fontWeight: 'bold',
                    }}
                  >
                    ✓ Your Vote
                  </span>
                )}
                {option.description && (
                  <div style={{ marginTop: '0.5rem', color: '#6c757d' }}>
                    {option.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showResults && results && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Results</h2>

          {/* Quorum Info */}
          {(proposal.status === 'Closed' || proposal.status === 'Finalized') && (
            <QuorumInfo
              quorumRequirement={proposal.quorumRequirement}
              quorumMet={proposal.quorumMet}
              totalVotesCast={proposal.totalVotesCast}
              eligibleVotingPowerSnapshot={proposal.eligibleVotingPowerSnapshot}
              eligibleVotingPower={results.eligibleVotingPower}
              style={{ marginBottom: '1.5rem' }}
            />
          )}

          <div style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>
              <strong>Total Voting Power:</strong> {results.totalVotingPower.toFixed(2)}
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {results.optionResults.map((result) => {
                const percentage =
                  results.totalVotingPower > 0
                    ? (result.totalVotingPower / results.totalVotingPower) * 100
                    : 0;
                const isWinner = results.winningOptionId === result.optionId;

                return (
                  <div
                    key={result.optionId}
                    style={{
                      padding: '1rem',
                      border: isWinner ? '2px solid #28a745' : '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: isWinner ? '#f0fff4' : 'white',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                        alignItems: 'center',
                      }}
                    >
                      <strong>
                        {result.optionText}
                        {isWinner && (
                          <span
                            style={{
                              marginLeft: '0.5rem',
                              color: '#28a745',
                              fontSize: '0.875rem',
                            }}
                          >
                            🏆 Winner
                          </span>
                        )}
                      </strong>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>
                    <div
                      style={{
                        height: '24px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          backgroundColor: isWinner ? '#28a745' : '#007bff',
                          width: `${percentage}%`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6c757d' }}>
                      Votes: {result.voteCount} | Voting Power: {result.totalVotingPower.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
