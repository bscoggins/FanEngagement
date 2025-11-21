import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { proposalsApi } from '../api/proposalsApi';
import type { ProposalDetails, Vote, ProposalResults } from '../types/api';

export const MyProposalPage: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const { user } = useAuth();
  const [proposal, setProposal] = useState<ProposalDetails | null>(null);
  const [userVote, setUserVote] = useState<Vote | null>(null);
  const [results, setResults] = useState<ProposalResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!proposalId || !user?.userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const proposalData = await proposalsApi.getById(proposalId);
        setProposal(proposalData);

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

        // Get results if proposal is Closed or Finalized
        if (proposalData.status === 'Closed' || proposalData.status === 'Finalized') {
          try {
            const resultsData = await proposalsApi.getResults(proposalId);
            setResults(resultsData);
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
    if (!proposalId || !user?.userId || !selectedOptionId) return;

    try {
      setSubmitting(true);
      setError('');
      setSuccessMessage('');

      const vote = await proposalsApi.castVote(proposalId, {
        proposalOptionId: selectedOptionId,
        userId: user.userId,
      });

      setUserVote(vote);
      setSuccessMessage('Your vote has been cast successfully!');
      setSelectedOptionId('');
    } catch (err: any) {
      console.error('Failed to cast vote:', err);
      setError(
        err.response?.data?.Error || err.response?.data?.message || 'Failed to cast vote.'
      );
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Draft: '#6c757d',
      Open: '#28a745',
      Closed: '#dc3545',
      Finalized: '#007bff',
    };
    return (
      <span
        style={{
          padding: '0.25rem 0.5rem',
          backgroundColor: colors[status] || '#6c757d',
          color: 'white',
          borderRadius: '4px',
          fontSize: '0.875rem',
        }}
      >
        {status}
      </span>
    );
  };

  const canVote = proposal.status === 'Open' && !userVote;
  const showResults = proposal.status === 'Closed' || proposal.status === 'Finalized';

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <Link
        to={`/me/organizations/${proposal.organizationId}`}
        style={{ color: '#007bff', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}
      >
        ← Back to Organization
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginTop: '1rem' }}>
        <h1 style={{ margin: 0 }}>{proposal.title}</h1>
        {getStatusBadge(proposal.status)}
      </div>

      {proposal.description && (
        <p style={{ color: '#6c757d', marginTop: '1rem' }}>{proposal.description}</p>
      )}

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
        {proposal.quorumRequirement && (
          <div>
            <strong>Quorum Required:</strong> {proposal.quorumRequirement}%
          </div>
        )}
      </div>

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

        {canVote ? (
          <form onSubmit={handleVote}>
            <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              {proposal.options.map((option) => (
                <label
                  key={option.id}
                  style={{
                    padding: '1rem',
                    border: selectedOptionId === option.id ? '2px solid #007bff' : '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: selectedOptionId === option.id ? '#e7f3ff' : 'white',
                    display: 'block',
                  }}
                >
                  <input
                    type="radio"
                    name="option"
                    value={option.id}
                    checked={selectedOptionId === option.id}
                    onChange={(e) => setSelectedOptionId(e.target.value)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <strong>{option.text}</strong>
                  {option.description && (
                    <div style={{ marginTop: '0.5rem', color: '#6c757d' }}>
                      {option.description}
                    </div>
                  )}
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={!selectedOptionId || submitting}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: selectedOptionId && !submitting ? '#28a745' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedOptionId && !submitting ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
              }}
            >
              {submitting ? 'Submitting...' : 'Cast Vote'}
            </button>
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
          <div style={{ marginTop: '1rem' }}>
            <div style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>
              <strong>Total Voting Power:</strong> {results.totalVotingPower}
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {results.optionResults.map((result) => {
                const percentage =
                  results.totalVotingPower > 0
                    ? (result.totalVotingPower / results.totalVotingPower) * 100
                    : 0;
                return (
                  <div
                    key={result.optionId}
                    style={{
                      padding: '1rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>{result.optionText}</strong>
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
                          backgroundColor: '#007bff',
                          width: `${percentage}%`,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6c757d' }}>
                      Votes: {result.voteCount} | Voting Power: {result.totalVotingPower}
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
