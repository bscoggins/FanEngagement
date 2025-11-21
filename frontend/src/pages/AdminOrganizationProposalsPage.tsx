import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { proposalsApi } from '../api/proposalsApi';
import { organizationsApi } from '../api/organizationsApi';
import type { Proposal, Organization, CreateProposalRequest, ProposalStatus } from '../types/api';

export const AdminOrganizationProposalsPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateProposalRequest>({
    title: '',
    description: '',
    status: 'Draft',
    startAt: '',
    endAt: '',
    quorumRequirement: undefined,
    createdByUserId: '', // Will be set from auth context when creating
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId) {
        setError('Invalid organization ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const [orgData, proposalsData] = await Promise.all([
          organizationsApi.getById(orgId),
          proposalsApi.getByOrganization(orgId),
        ]);
        
        setOrganization(orgData);
        setProposals(proposalsData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [orgId]);

  const refetchData = async () => {
    if (!orgId) return;

    try {
      const [orgData, proposalsData] = await Promise.all([
        organizationsApi.getById(orgId),
        proposalsApi.getByOrganization(orgId),
      ]);
      
      setOrganization(orgData);
      setProposals(proposalsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const handleCreateNew = () => {
    const authUserStr = localStorage.getItem('authUser');
    const authUser = authUserStr ? JSON.parse(authUserStr) : null;
    
    setFormData({
      title: '',
      description: '',
      status: 'Draft',
      startAt: '',
      endAt: '',
      quorumRequirement: undefined,
      createdByUserId: authUser?.userId || '',
    });
    setShowForm(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      title: '',
      description: '',
      status: 'Draft',
      startAt: '',
      endAt: '',
      quorumRequirement: undefined,
      createdByUserId: '',
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgId || !formData.title.trim() || !formData.createdByUserId) {
      setError('Title and creator are required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Filter out empty optional fields
      const requestData: CreateProposalRequest = {
        title: formData.title,
        description: formData.description || undefined,
        status: formData.status,
        startAt: formData.startAt || undefined,
        endAt: formData.endAt || undefined,
        quorumRequirement: formData.quorumRequirement,
        createdByUserId: formData.createdByUserId,
      };

      await proposalsApi.create(orgId, requestData);
      
      setSuccessMessage('Proposal created successfully');
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        status: 'Draft',
        startAt: '',
        endAt: '',
        quorumRequirement: undefined,
        createdByUserId: '',
      });
      
      await refetchData();
    } catch (err: unknown) {
      console.error('Failed to create proposal:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { Error?: string } } };
        setError(axiosError.response?.data?.Error || 'Failed to create proposal');
      } else {
        setError('Failed to create proposal. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error && !organization) {
    return (
      <div>
        <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
        <Link to="/admin/organizations">← Back to Organizations</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/admin/organizations" style={{ color: '#007bff', textDecoration: 'none' }}>
          ← Back to Organizations
        </Link>
      </div>

      <h1>Proposals for {organization?.name}</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        {organization?.description || 'No description'}
      </p>

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

      {!showForm && (
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={handleCreateNew}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            Create New Proposal
          </button>
        </div>
      )}

      {showForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2>Create New Proposal</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
              <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              <label htmlFor="status" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Status *
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProposalStatus })}
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
                <label htmlFor="startAt" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="startAt"
                  value={formData.startAt}
                  onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
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
                <label htmlFor="endAt" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="endAt"
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
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
              <label htmlFor="quorumRequirement" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Quorum Requirement (%)
              </label>
              <input
                type="number"
                id="quorumRequirement"
                step="0.01"
                min="0"
                max="100"
                value={formData.quorumRequirement ?? ''}
                onChange={(e) => setFormData({
                  ...formData,
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
                {isSaving ? 'Creating...' : 'Create Proposal'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
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

      {proposals.length === 0 ? (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <p style={{ color: '#6c757d', fontSize: '1.1rem' }}>
            No proposals found for this organization.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '1rem',
        }}>
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              style={{
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '1.5rem',
                backgroundColor: 'white',
                transition: 'box-shadow 0.2s',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{proposal.title}</h3>
                  {proposal.description && (
                    <p style={{ color: '#666', marginBottom: '0.5rem' }}>{proposal.description}</p>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#666' }}>
                    <span>
                      <strong>Status:</strong>{' '}
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: getStatusBadgeColor(proposal.status),
                        color: 'white',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                      }}>
                        {proposal.status}
                      </span>
                    </span>
                    <span><strong>Start:</strong> {formatDate(proposal.startAt)}</span>
                    <span><strong>End:</strong> {formatDate(proposal.endAt)}</span>
                    {proposal.quorumRequirement !== null && proposal.quorumRequirement !== undefined && (
                      <span><strong>Quorum:</strong> {proposal.quorumRequirement}%</span>
                    )}
                  </div>
                </div>
                <div style={{ marginLeft: '1rem' }}>
                  <Link
                    to={`/admin/organizations/${orgId}/proposals/${proposal.id}`}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      display: 'inline-block',
                      fontSize: '0.9rem',
                    }}
                  >
                    View/Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
