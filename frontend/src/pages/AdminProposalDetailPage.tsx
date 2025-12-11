import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { proposalsApi } from '../api/proposalsApi';
import { ProposalStatusBadge } from '../components/ProposalStatusBadge';
import { ProposalTimingInfo } from '../components/ProposalTimingInfo';
import { QuorumInfo } from '../components/QuorumInfo';
import { parseApiError } from '../utils/errorUtils';
import { Card } from '../components/Card';
import type {
  ProposalDetails,
  UpdateProposalRequest,
  AddProposalOptionRequest,
  ProposalResults,
} from '../types/api';

export const AdminProposalDetailPage: React.FC = () => {
  const { orgId, proposalId } = useParams<{ orgId: string; proposalId: string }>();
  
  const [proposal, setProposal] = useState<ProposalDetails | null>(null);
  const [results, setResults] = useState<ProposalResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<UpdateProposalRequest>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Option management
  const [showAddOptionForm, setShowAddOptionForm] = useState(false);
  const [optionFormData, setOptionFormData] = useState<AddProposalOptionRequest>({
    text: '',
    description: '',
  });
  const [isAddingOption, setIsAddingOption] = useState(false);

  useEffect(() => {
    const fetchProposal = async () => {
      if (!proposalId) {
        setError('Invalid proposal ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const proposalData = await proposalsApi.getById(proposalId);
        setProposal(proposalData);
        
        // Fetch results if proposal is Closed or Finalized
        if (proposalData.status === 'Closed' || proposalData.status === 'Finalized') {
          try {
            const resultsData = await proposalsApi.getResults(proposalId);
            setResults(resultsData);
          } catch (err) {
            console.error('Failed to fetch results:', err);
            // Don't set error state, as the proposal loaded successfully
          }
        }
      } catch (err) {
        console.error('Failed to fetch proposal:', err);
        setError('Failed to load proposal. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposal();
  }, [proposalId]);

  const refetchProposal = async () => {
    if (!proposalId) return;

    try {
      const proposalData = await proposalsApi.getById(proposalId);
      setProposal(proposalData);
      
      // Fetch results if proposal is Closed or Finalized
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
    }
  };

  const handleEditClick = () => {
    if (!proposal) return;
    
    setEditFormData({
      title: proposal.title,
      description: proposal.description || '',
    });
    setIsEditing(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData({});
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!proposalId || !editFormData.title?.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Only send title and description (backend only supports these fields)
      const updateData: UpdateProposalRequest = {
        title: editFormData.title,
        description: editFormData.description || undefined,
      };

      await proposalsApi.update(proposalId, updateData);
      
      setSuccessMessage('Proposal updated successfully');
      setIsEditing(false);
      await refetchProposal();
    } catch (err: unknown) {
      console.error('Failed to update proposal:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { Error?: string } } };
        setError(axiosError.response?.data?.Error || 'Failed to update proposal');
      } else {
        setError('Failed to update proposal. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseProposal = async () => {
    if (!proposalId) return;
    
    if (!confirm('Are you sure you want to close this proposal? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      await proposalsApi.close(proposalId);
      setSuccessMessage('Proposal closed successfully');
      await refetchProposal();
    } catch (err: unknown) {
      console.error('Failed to close proposal:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    }
  };

  const handleOpenProposal = async () => {
    if (!proposalId) return;
    
    if (!confirm('Are you sure you want to open this proposal for voting?')) {
      return;
    }

    try {
      setError(null);
      await proposalsApi.open(proposalId);
      setSuccessMessage('Proposal opened successfully');
      await refetchProposal();
    } catch (err: unknown) {
      console.error('Failed to open proposal:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    }
  };

  const handleFinalizeProposal = async () => {
    if (!proposalId) return;
    
    if (!confirm('Are you sure you want to finalize this proposal? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      await proposalsApi.finalize(proposalId);
      setSuccessMessage('Proposal finalized successfully');
      await refetchProposal();
    } catch (err: unknown) {
      console.error('Failed to finalize proposal:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!proposalId || !optionFormData.text.trim()) {
      setError('Option text is required');
      return;
    }

    try {
      setIsAddingOption(true);
      setError(null);

      await proposalsApi.addOption(proposalId, {
        text: optionFormData.text,
        description: optionFormData.description || undefined,
      });
      
      setSuccessMessage('Option added successfully');
      setShowAddOptionForm(false);
      setOptionFormData({ text: '', description: '' });
      await refetchProposal();
    } catch (err: unknown) {
      console.error('Failed to add option:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsAddingOption(false);
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!proposalId) return;
    
    if (!confirm('Are you sure you want to delete this option?')) {
      return;
    }

    try {
      setError(null);
      await proposalsApi.deleteOption(proposalId, optionId);
      setSuccessMessage('Option deleted successfully');
      await refetchProposal();
    } catch (err: unknown) {
      console.error('Failed to delete option:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const canEdit = proposal && (proposal.status === 'Draft' || proposal.status === 'Open');
  const canOpen = proposal && proposal.status === 'Draft';
  const canClose = proposal && proposal.status === 'Open';
  const canFinalize = proposal && proposal.status === 'Closed';
  const canDeleteOptions = proposal && proposal.status === 'Draft'; // Only Draft proposals can have options deleted
  const showResults = proposal && (proposal.status === 'Open' || proposal.status === 'Closed' || proposal.status === 'Finalized');

  if (isLoading) {
    return (
      <div className="admin-page">
        <Card>Loading...</Card>
      </div>
    );
  }

  if (error && !proposal) {
    return (
      <div className="admin-page">
        <div className="admin-alert admin-alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
          {error}
        </div>
        <Link to={`/admin/organizations/${orgId}/proposals`} className="admin-button admin-button-ghost">
          ← Back to Proposals
        </Link>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="admin-page">
        <div className="admin-alert admin-alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
          Proposal not found
        </div>
        <Link to={`/admin/organizations/${orgId}/proposals`} className="admin-button admin-button-ghost">
          ← Back to Proposals
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <Link to={`/admin/organizations/${orgId}/proposals`} className="admin-button admin-button-ghost">
          ← Back to Proposals
        </Link>
      </div>

      <div className="admin-page-header">
        <div className="admin-page-title-group" style={{ gap: 'var(--spacing-2)' }}>
          <h1 style={{ marginBottom: 0 }}>{proposal.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
            <ProposalStatusBadge status={proposal.status} />
            <ProposalTimingInfo
              status={proposal.status}
              startAt={proposal.startAt}
              endAt={proposal.endAt}
              style={{ marginTop: 0 }}
            />
          </div>
        </div>
        {!isEditing && (
          <div className="admin-page-actions">
            {canEdit && (
              <button type="button" onClick={handleEditClick} className="admin-button admin-button-outline">
                Edit
              </button>
            )}
            {canOpen && (
              <button type="button" onClick={handleOpenProposal} className="admin-button admin-button-success">
                Open Proposal
              </button>
            )}
            {canClose && (
              <button type="button" onClick={handleCloseProposal} className="admin-button admin-button-danger">
                Close Proposal
              </button>
            )}
            {canFinalize && (
              <button type="button" onClick={handleFinalizeProposal} className="admin-button admin-button-neutral">
                Finalize
              </button>
            )}
          </div>
        )}
      </div>

      {successMessage && (
        <div className="admin-alert admin-alert-success" style={{ marginBottom: 'var(--spacing-4)' }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
          {error}
        </div>
      )}

      {!isEditing ? (
        <div className="admin-card">
          <div className="admin-info-grid">
            <div>
              <span className="admin-info-grid-label">Start Date</span>
              <div>{formatDate(proposal.startAt)}</div>
            </div>
            <div>
              <span className="admin-info-grid-label">End Date</span>
              <div>{formatDate(proposal.endAt)}</div>
            </div>
            <div>
              <span className="admin-info-grid-label">Quorum Requirement</span>
              <div>
                {proposal.quorumRequirement !== null && proposal.quorumRequirement !== undefined
                  ? `${proposal.quorumRequirement}%`
                  : 'N/A'}
              </div>
            </div>
            <div>
              <span className="admin-info-grid-label">Created</span>
              <div>{formatDate(proposal.createdAt)}</div>
            </div>
            {proposal.eligibleVotingPowerSnapshot !== undefined && proposal.eligibleVotingPowerSnapshot !== null && (
              <div>
                <span className="admin-info-grid-label">Eligible Voting Power</span>
                <div>{proposal.eligibleVotingPowerSnapshot.toFixed(2)}</div>
              </div>
            )}
            {proposal.totalVotesCast !== undefined && proposal.totalVotesCast !== null && (
              <div>
                <span className="admin-info-grid-label">Total Votes Cast</span>
                <div>{proposal.totalVotesCast.toFixed(2)}</div>
              </div>
            )}
            {proposal.quorumMet !== undefined && proposal.quorumMet !== null && (
              <div>
                <span className="admin-info-grid-label">Quorum Status</span>
                <div className={proposal.quorumMet ? 'admin-pill admin-pill-success' : 'admin-pill admin-pill-danger'}>
                  {proposal.quorumMet ? 'Met' : 'Not Met'}
                </div>
              </div>
            )}
            {proposal.closedAt && (
              <div>
                <span className="admin-info-grid-label">Closed At</span>
                <div>{formatDate(proposal.closedAt)}</div>
              </div>
            )}
          </div>

          {proposal.description && (
            <div>
              <h3 style={{ marginBottom: 'var(--spacing-2)' }}>Description</h3>
              <p className="admin-secondary-text" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {proposal.description}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-card">
          <h2 style={{ marginTop: 0 }}>Edit Proposal</h2>
          <form
            onSubmit={handleSaveEdit}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}
          >
            <div>
              <label htmlFor="editTitle" className="admin-form-label">
                Title *
              </label>
              <input
                type="text"
                id="editTitle"
                value={editFormData.title || ''}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                className="admin-input"
                required
              />
            </div>

            <div>
              <label htmlFor="editDescription" className="admin-form-label">
                Description
              </label>
              <textarea
                id="editDescription"
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="admin-textarea"
                style={{ minHeight: '100px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={isSaving}
                className="admin-button admin-button-success"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="admin-button admin-button-outline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-section-header">
          <h2 style={{ margin: 0 }}>Options</h2>
          {canEdit && !showAddOptionForm && (
            <button
              type="button"
              onClick={() => setShowAddOptionForm(true)}
              className="admin-button admin-button-success"
            >
              Add Option
            </button>
          )}
        </div>

        {showAddOptionForm && (
          <div className="admin-option-card" style={{ marginBottom: 'var(--spacing-4)' }}>
            <h3 style={{ marginTop: 0 }}>Add New Option</h3>
            <form
              onSubmit={handleAddOption}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}
            >
              <div>
                <label htmlFor="optionText" className="admin-form-label">
                  Option Text *
                </label>
                <input
                  type="text"
                  id="optionText"
                  value={optionFormData.text}
                  onChange={(e) => setOptionFormData({ ...optionFormData, text: e.target.value })}
                  className="admin-input"
                  required
                />
              </div>

              <div>
                <label htmlFor="optionDescription" className="admin-form-label">
                  Description
                </label>
                <textarea
                  id="optionDescription"
                  value={optionFormData.description}
                  onChange={(e) => setOptionFormData({ ...optionFormData, description: e.target.value })}
                  className="admin-textarea"
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  disabled={isAddingOption}
                  className="admin-button admin-button-success"
                >
                  {isAddingOption ? 'Adding...' : 'Add Option'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOptionForm(false);
                    setOptionFormData({ text: '', description: '' });
                  }}
                  disabled={isAddingOption}
                  className="admin-button admin-button-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {proposal.options.length === 0 ? (
          <p className="admin-secondary-text" style={{ fontStyle: 'italic', margin: 0 }}>
            No options added yet.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
            {proposal.options.map((option) => (
              <div key={option.id} className="admin-option-card">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 'var(--spacing-4)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 260px' }}>
                    <strong style={{ display: 'block', marginBottom: 'var(--spacing-1)' }}>
                      {option.text}
                    </strong>
                    {option.description && (
                      <p className="admin-secondary-text" style={{ margin: 0 }}>
                        {option.description}
                      </p>
                    )}
                  </div>
                  {canDeleteOptions && (
                    <button
                      type="button"
                      onClick={() => handleDeleteOption(option.id)}
                      className="admin-button admin-button-danger"
                      style={{ alignSelf: 'flex-start' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showResults && results && (
        <div className="admin-card">
          <div className="admin-section-header">
            <h2 style={{ margin: 0 }}>Results</h2>
          </div>

          {(proposal.status === 'Closed' || proposal.status === 'Finalized') && (
            <QuorumInfo
              quorumRequirement={proposal.quorumRequirement}
              quorumMet={proposal.quorumMet}
              totalVotesCast={proposal.totalVotesCast}
              eligibleVotingPowerSnapshot={proposal.eligibleVotingPowerSnapshot}
              eligibleVotingPower={results.eligibleVotingPower}
              style={{ marginBottom: 'var(--spacing-4)' }}
            />
          )}

          <div style={{ marginBottom: 'var(--spacing-4)' }}>
            <strong>Total Voting Power:</strong> {results.totalVotingPower.toFixed(2)}
          </div>

          {results.optionResults.length === 0 ? (
            <p className="admin-secondary-text" style={{ fontStyle: 'italic', margin: 0 }}>
              No votes cast yet.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
              {results.optionResults.map((result) => {
                const percentage = results.totalVotingPower > 0
                  ? ((result.totalVotingPower / results.totalVotingPower) * 100).toFixed(1)
                  : '0.0';
                const isWinner = results.winningOptionId === result.optionId;

                return (
                  <div
                    key={result.optionId}
                    className={`admin-option-card${isWinner ? ' winner' : ''}`}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-3)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong>{result.optionText}</strong>
                      {isWinner && <span className="admin-pill admin-pill-success">Winner</span>}
                    </div>
                    <div
                      className="admin-meta-text"
                      style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-4)' }}
                    >
                      <span><strong>Votes:</strong> {result.voteCount}</span>
                      <span><strong>Voting Power:</strong> {result.totalVotingPower.toFixed(2)}</span>
                      <span><strong>Percentage:</strong> {percentage}%</span>
                    </div>
                    <div className="admin-progress-track">
                      <div className="admin-progress-fill" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
