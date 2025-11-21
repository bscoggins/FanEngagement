import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { proposalsApi } from '../api/proposalsApi';
import type {
  ProposalDetails,
  UpdateProposalRequest,
  AddProposalOptionRequest,
  ProposalResults,
  ProposalStatus,
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

  useEffect(() => {
    fetchProposal();
  }, [proposalId]);

  const handleEditClick = () => {
    if (!proposal) return;
    
    setEditFormData({
      title: proposal.title,
      description: proposal.description || '',
      status: proposal.status,
      startAt: proposal.startAt ? formatDateTimeLocal(proposal.startAt) : '',
      endAt: proposal.endAt ? formatDateTimeLocal(proposal.endAt) : '',
      quorumRequirement: proposal.quorumRequirement,
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

      // Build update request with only changed fields
      const updateData: UpdateProposalRequest = {
        title: editFormData.title,
        description: editFormData.description || undefined,
        status: editFormData.status,
        startAt: editFormData.startAt || undefined,
        endAt: editFormData.endAt || undefined,
        quorumRequirement: editFormData.quorumRequirement,
      };

      await proposalsApi.update(proposalId, updateData);
      
      setSuccessMessage('Proposal updated successfully');
      setIsEditing(false);
      await fetchProposal();
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
      await fetchProposal();
    } catch (err: unknown) {
      console.error('Failed to close proposal:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { Error?: string } } };
        setError(axiosError.response?.data?.Error || 'Failed to close proposal');
      } else {
        setError('Failed to close proposal. Please try again.');
      }
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
      await fetchProposal();
    } catch (err: unknown) {
      console.error('Failed to add option:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { Error?: string } } };
        setError(axiosError.response?.data?.Error || 'Failed to add option');
      } else {
        setError('Failed to add option. Please try again.');
      }
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
      await fetchProposal();
    } catch (err: unknown) {
      console.error('Failed to delete option:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { Error?: string } } };
        setError(axiosError.response?.data?.Error || 'Failed to delete option');
      } else {
        setError('Failed to delete option. Please try again.');
      }
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const formatDateTimeLocal = (dateStr: string): string => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getStatusBadgeColor = (status: ProposalStatus) => {
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
  };

  const canEdit = proposal && (proposal.status === 'Draft' || proposal.status === 'Open');
  const canClose = proposal && (proposal.status === 'Draft' || proposal.status === 'Open');
  const showResults = proposal && (proposal.status === 'Closed' || proposal.status === 'Finalized');

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error && !proposal) {
    return (
      <div>
        <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
        <Link to={`/admin/organizations/${orgId}/proposals`}>← Back to Proposals</Link>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div>
        <div style={{ color: 'red', marginBottom: '1rem' }}>Proposal not found</div>
        <Link to={`/admin/organizations/${orgId}/proposals`}>← Back to Proposals</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link
          to={`/admin/organizations/${orgId}/proposals`}
          style={{ color: '#007bff', textDecoration: 'none' }}
        >
          ← Back to Proposals
        </Link>
      </div>

      {successMessage && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '4px',
          border: '1px solid #c3e6cb'
        }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {!isEditing ? (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{proposal.title}</h1>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                backgroundColor: getStatusBadgeColor(proposal.status),
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 'bold',
              }}>
                {proposal.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {canEdit && (
                <button
                  onClick={handleEditClick}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Edit
                </button>
              )}
              {canClose && (
                <button
                  onClick={handleCloseProposal}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Close Proposal
                </button>
              )}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px'
          }}>
            <div>
              <strong style={{ display: 'block', color: '#666', marginBottom: '0.25rem' }}>Start Date</strong>
              <div>{formatDate(proposal.startAt)}</div>
            </div>
            <div>
              <strong style={{ display: 'block', color: '#666', marginBottom: '0.25rem' }}>End Date</strong>
              <div>{formatDate(proposal.endAt)}</div>
            </div>
            <div>
              <strong style={{ display: 'block', color: '#666', marginBottom: '0.25rem' }}>Quorum</strong>
              <div>
                {proposal.quorumRequirement !== null && proposal.quorumRequirement !== undefined
                  ? `${proposal.quorumRequirement}%`
                  : 'N/A'}
              </div>
            </div>
            <div>
              <strong style={{ display: 'block', color: '#666', marginBottom: '0.25rem' }}>Created</strong>
              <div>{formatDate(proposal.createdAt)}</div>
            </div>
          </div>

          {proposal.description && (
            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Description</strong>
              <p style={{ color: '#666', whiteSpace: 'pre-wrap' }}>{proposal.description}</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2>Edit Proposal</h2>
          <form onSubmit={handleSaveEdit}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="editTitle" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Title *
              </label>
              <input
                type="text"
                id="editTitle"
                value={editFormData.title || ''}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="editDescription" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Description
              </label>
              <textarea
                id="editDescription"
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  minHeight: '100px',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="editStatus" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Status
              </label>
              <select
                id="editStatus"
                value={editFormData.status || ''}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as ProposalStatus })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              >
                <option value="Draft">Draft</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Finalized">Finalized</option>
              </select>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label htmlFor="editStartAt" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="editStartAt"
                  value={editFormData.startAt || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, startAt: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '1rem',
                  }}
                />
              </div>

              <div>
                <label htmlFor="editEndAt" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="editEndAt"
                  value={editFormData.endAt || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, endAt: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '1rem',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="editQuorumRequirement" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Quorum Requirement (%)
              </label>
              <input
                type="number"
                id="editQuorumRequirement"
                step="0.01"
                min="0"
                max="100"
                value={editFormData.quorumRequirement ?? ''}
                onChange={(e) => setEditFormData({
                  ...editFormData,
                  quorumRequirement: e.target.value ? parseFloat(e.target.value) : undefined
                })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                disabled={isSaving}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isSaving ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'white',
                  color: '#6c757d',
                  border: '1px solid #6c757d',
                  borderRadius: '4px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Options Section */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Options</h2>
          {canEdit && !showAddOptionForm && (
            <button
              onClick={() => setShowAddOptionForm(true)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Add Option
            </button>
          )}
        </div>

        {showAddOptionForm && (
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ marginTop: 0 }}>Add New Option</h3>
            <form onSubmit={handleAddOption}>
              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="optionText" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Option Text *
                </label>
                <input
                  type="text"
                  id="optionText"
                  value={optionFormData.text}
                  onChange={(e) => setOptionFormData({ ...optionFormData, text: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '1rem',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="optionDescription" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Description
                </label>
                <textarea
                  id="optionDescription"
                  value={optionFormData.description}
                  onChange={(e) => setOptionFormData({ ...optionFormData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    minHeight: '80px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  disabled={isAddingOption}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: isAddingOption ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isAddingOption ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
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
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'white',
                    color: '#6c757d',
                    border: '1px solid #6c757d',
                    borderRadius: '4px',
                    cursor: isAddingOption ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {proposal.options.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No options added yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {proposal.options.map((option) => (
              <div
                key={option.id}
                style={{
                  padding: '1rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{option.text}</strong>
                    {option.description && (
                      <p style={{ color: '#666', margin: 0 }}>{option.description}</p>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteOption(option.id)}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        marginLeft: '1rem',
                      }}
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

      {/* Results Section */}
      {showResults && results && (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '2rem'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Results</h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <strong>Total Voting Power:</strong> {results.totalVotingPower.toFixed(2)}
          </div>

          {results.optionResults.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No votes cast yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {results.optionResults.map((result) => {
                const percentage = results.totalVotingPower > 0
                  ? (result.totalVotingPower / results.totalVotingPower * 100).toFixed(1)
                  : '0.0';
                
                return (
                  <div
                    key={result.optionId}
                    style={{
                      padding: '1rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      backgroundColor: '#f8f9fa',
                    }}
                  >
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>{result.optionText}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: '#666' }}>
                      <span><strong>Votes:</strong> {result.voteCount}</span>
                      <span><strong>Voting Power:</strong> {result.totalVotingPower.toFixed(2)}</span>
                      <span><strong>Percentage:</strong> {percentage}%</span>
                    </div>
                    <div style={{
                      marginTop: '0.5rem',
                      height: '20px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        backgroundColor: '#007bff',
                        transition: 'width 0.3s ease'
                      }} />
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
