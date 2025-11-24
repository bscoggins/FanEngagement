import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { organizationsApi } from '../api/organizationsApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { parseApiError } from '../utils/errorUtils';
import { useNotifications } from '../contexts/NotificationContext';
import type { Organization, PagedResult, CreateOrganizationRequest } from '../types/api';

export const AdminOrganizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [pagedResult, setPagedResult] = useState<PagedResult<Organization> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateOrganizationRequest>({
    name: '',
    description: '',
  });
  const pageSize = 10;

  const fetchOrganizations = async (page: number, search: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await organizationsApi.getAllPaged(page, pageSize, search || undefined);
      setPagedResult(data);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsCreating(true);
      const newOrg = await organizationsApi.create(createFormData);
      showSuccess('Organization created successfully!');
      setShowCreateForm(false);
      setCreateFormData({ name: '', description: '' });
      
      // Navigate to the edit page for the new organization
      navigate(`/admin/organizations/${newOrg.id}/edit`);
    } catch (err) {
      console.error('Failed to create organization:', err);
      const errorMessage = parseApiError(err);
      showError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1>Organization Management</h1>
        <LoadingSpinner message="Loading organizations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>Organization Management</h1>
        <ErrorMessage message={error} onRetry={() => fetchOrganizations(currentPage, searchQuery)} />
      </div>
    );
  }

  const organizations = pagedResult?.items || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Organization Management</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          {showCreateForm ? 'Cancel' : '+ Create Organization'}
        </button>
      </div>

      {showCreateForm && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Create New Organization</h2>
          <form onSubmit={handleCreateOrganization}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                id="name"
                type="text"
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                required
                maxLength={200}
                disabled={isCreating}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Description
              </label>
              <textarea
                id="description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                maxLength={1000}
                disabled={isCreating}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={isCreating}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isCreating ? '#ccc' : '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 500,
                }}
              >
                {isCreating ? 'Creating...' : 'Create Organization'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateFormData({ name: '', description: '' });
                }}
                disabled={isCreating}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'white',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by organization name..."
        />
        <div style={{ color: '#666', fontSize: '0.875rem' }}>
          {pagedResult && (
            <span>
              Showing {organizations.length > 0 ? ((currentPage - 1) * pageSize + 1) : 0} - {Math.min(currentPage * pageSize, pagedResult.totalCount)} of {pagedResult.totalCount} organizations
            </span>
          )}
        </div>
      </div>
      
      {organizations.length === 0 ? (
        <EmptyState message={searchQuery ? "No organizations found matching your search." : "No organizations found."} />
      ) : (
        <>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Created</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '1rem' }}>{org.name}</td>
                    <td style={{ padding: '1rem', color: '#666', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {org.description || <em style={{ color: '#999' }}>No description</em>}
                    </td>
                    <td style={{ padding: '1rem', color: '#666', fontSize: '0.9rem' }}>
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link
                          to={`/admin/organizations/${org.id}/edit`}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#0066cc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            display: 'inline-block',
                            fontSize: '0.875rem',
                          }}
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/admin/organizations/${org.id}/memberships`}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            display: 'inline-block',
                            fontSize: '0.875rem',
                          }}
                        >
                          Members
                        </Link>
                        <Link
                          to={`/admin/organizations/${org.id}/share-types`}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            display: 'inline-block',
                            fontSize: '0.875rem',
                          }}
                        >
                          Share Types
                        </Link>
                        <Link
                          to={`/admin/organizations/${org.id}/proposals`}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            display: 'inline-block',
                            fontSize: '0.875rem',
                          }}
                        >
                          Proposals
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
