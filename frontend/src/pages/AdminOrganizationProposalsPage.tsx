import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { proposalsApi } from '../api/proposalsApi';
import { useAuth } from '../auth/AuthContext';
import { organizationsApi } from '../api/organizationsApi';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { ProposalStatusBadge } from '../components/ProposalStatusBadge';
import { ProposalTimingInfo } from '../components/ProposalTimingInfo';
import type { Proposal, Organization, CreateProposalRequest, ProposalStatus, PagedResult } from '../types/api';

export const AdminOrganizationProposalsPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { user } = useAuth();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [pagedResult, setPagedResult] = useState<PagedResult<Proposal> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | ''>('');
  const pageSize = 10;
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateProposalRequest>({
    title: '',
    description: '',
    startAt: undefined,
    endAt: undefined,
    quorumRequirement: undefined,
    createdByUserId: '', // Will be set from auth context when creating
  });
  const [isSaving, setIsSaving] = useState(false);

  // Helper function to convert datetime-local to ISO 8601 with timezone
  const convertToISO8601 = (dateTimeLocal?: string): string | undefined => {
    if (!dateTimeLocal) return undefined;
    // Treat datetime-local input as UTC by appending 'Z' before conversion
    return new Date(dateTimeLocal + 'Z').toISOString();
  };

  const fetchData = async (page: number, search: string, status: ProposalStatus | '') => {
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
        proposalsApi.getByOrganizationPaged(orgId, page, pageSize, status || undefined, search || undefined),
      ]);
      
      setOrganization(orgData);
      setPagedResult(proposalsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage, searchQuery, statusFilter);
  }, [orgId, currentPage, searchQuery, statusFilter]);

  const refetchData = () => {
    fetchData(currentPage, searchQuery, statusFilter);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleStatusFilterChange = (status: ProposalStatus | '') => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleCreateNew = () => {
    setFormData({
      title: '',
      description: '',
      startAt: undefined,
      endAt: undefined,
      quorumRequirement: undefined,
      createdByUserId: user?.userId || '',
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
      startAt: undefined,
      endAt: undefined,
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

      // Convert datetime-local to ISO 8601 and filter out empty optional fields
      const requestData: CreateProposalRequest = {
        title: formData.title,
        description: formData.description || undefined,
        startAt: convertToISO8601(formData.startAt),
        endAt: convertToISO8601(formData.endAt),
        quorumRequirement: formData.quorumRequirement,
        createdByUserId: formData.createdByUserId,
      };

      await proposalsApi.create(orgId, requestData);
      
      setSuccessMessage('Proposal created successfully');
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        startAt: undefined,
        endAt: undefined,
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

  const proposals = pagedResult?.items || [];

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
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
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

          <div style={{ flex: 1, minWidth: '250px' }}>
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search proposals by title..."
            />
          </div>

          <div>
            <label htmlFor="statusFilter" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
              Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value as ProposalStatus | '')}
              style={{
                padding: '0.5rem',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '1rem',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Finalized">Finalized</option>
            </select>
          </div>

          {pagedResult && (
            <div style={{ color: '#666', fontSize: '0.875rem', marginLeft: 'auto' }}>
              {pagedResult.totalCount} proposal{pagedResult.totalCount !== 1 ? 's' : ''} total
            </div>
          )}
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
                  value={formData.startAt ?? ''}
                  onChange={(e) => setFormData({ ...formData, startAt: e.target.value || undefined })}
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
                  value={formData.endAt ?? ''}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value || undefined })}
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
            {searchQuery || statusFilter ? "No proposals found matching your filters." : "No proposals found for this organization."}
          </p>
        </div>
      ) : (
        <>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: 0 }}>{proposal.title}</h3>
                    <ProposalStatusBadge status={proposal.status} />
                  </div>
                  {proposal.description && (
                    <p style={{ color: '#666', marginBottom: '0.5rem', marginTop: '0.5rem' }}>{proposal.description}</p>
                  )}
                  <ProposalTimingInfo
                    status={proposal.status}
                    startAt={proposal.startAt}
                    endAt={proposal.endAt}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', color: '#6c757d' }}>
                    <span><strong>Start:</strong> {formatDate(proposal.startAt)}</span>
                    <span><strong>End:</strong> {formatDate(proposal.endAt)}</span>
                    {proposal.quorumRequirement !== null && proposal.quorumRequirement !== undefined && (
                      <span><strong>Quorum:</strong> {proposal.quorumRequirement}%</span>
                    )}
                    {proposal.quorumMet !== undefined && proposal.quorumMet !== null && (
                      <span style={{ 
                        color: proposal.quorumMet ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                      }}>
                        {proposal.quorumMet ? '✓ Quorum Met' : '✗ Quorum Not Met'}
                      </span>
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

          {pagedResult && (
            <Pagination
              currentPage={pagedResult.page}
              totalPages={pagedResult.totalPages}
              onPageChange={handlePageChange}
              hasPreviousPage={pagedResult.hasPreviousPage}
              hasNextPage={pagedResult.hasNextPage}
            />
          )}
        </>
      )}
    </div>
  );
};
