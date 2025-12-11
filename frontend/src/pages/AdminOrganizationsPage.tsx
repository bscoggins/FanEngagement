import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationsApi } from '../api/organizationsApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { Table, type TableColumn } from '../components/Table';
import { Button } from '../components/Button';
import { parseApiError } from '../utils/errorUtils';
import { useNotifications } from '../contexts/NotificationContext';
import { useTableData } from '../hooks/useTableData';
import type { Organization, CreateOrganizationRequest } from '../types/api';

export const AdminOrganizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateOrganizationRequest>({
    name: '',
    description: '',
  });

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch all organizations for client-side sorting, filtering, and pagination
      // This approach provides consistent sorting across all pages and immediate search feedback
      // Trade-off: Performance may degrade with very large datasets (consider server-side for 1000+ orgs)
      const data = await organizationsApi.getAll();
      setAllOrganizations(data);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const {
    paginatedData: paginatedOrganizations,
    currentPage,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    setCurrentPage,
    handleSort,
    sortConfig,
  } = useTableData({
    data: allOrganizations,
    searchQuery,
    searchFields: (org) => [org.name, org.description || ''],
    initialSortConfig: { key: 'name', direction: 'asc' },
    customSortFields: {
      name: (org) => org.name.toLowerCase(),
      created: (org) => new Date(org.createdAt),
    },
    pageSize: 10,
    componentName: 'AdminOrganizationsPage',
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsCreating(true);
      const newOrg = await organizationsApi.create(createFormData);
      showSuccess('Organization created successfully!');
      setShowCreateForm(false);
      setCreateFormData({ name: '', description: '' });
      
      // Refresh the list to include the new organization
      await fetchOrganizations();
      
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
        <ErrorMessage message={error} onRetry={() => fetchOrganizations()} />
      </div>
    );
  }

  const columns: TableColumn<Organization>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (org) => org.name,
      sortable: true,
    },
    {
      key: 'description',
      label: 'Description',
      render: (org) => (
        <span className={org.description ? 'text-truncate text-truncate-md' : 'text-secondary'}>
          {org.description || 'No description'}
        </span>
      ),
    },
    {
      key: 'created',
      label: 'Created',
      render: (org) => (
        <span className="text-secondary">
          {new Date(org.createdAt).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (org) => (
        <div className="table-actions">
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/organizations/${org.id}/edit`);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/organizations/${org.id}/memberships`);
            }}
          >
            Members
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/organizations/${org.id}/share-types`);
            }}
          >
            Share Types
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/organizations/${org.id}/proposals`);
            }}
          >
            Proposals
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Organization Management</h1>
        <Button
          variant="secondary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ Create Organization'}
        </Button>
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
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          <span>
            Showing {paginatedOrganizations.length > 0 ? ((currentPage - 1) * PAGE_SIZE + 1) : 0} - {Math.min(currentPage * PAGE_SIZE, sortedOrganizations.length)} of {sortedOrganizations.length} organizations
          </span>
        </div>
      </div>
      
      {paginatedOrganizations.length === 0 ? (
        <EmptyState message={searchQuery ? "No organizations found matching your search." : "No organizations found."} />
      ) : (
        <>
          <Table
            data={paginatedOrganizations}
            columns={columns}
            getRowKey={(org) => org.id}
            mobileLayout="card"
            sortConfig={sortConfig}
            onSort={handleSort}
            testId="organizations-table"
            caption="List of organizations in the system"
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
          />
        </>
      )}
    </div>
  );
};
