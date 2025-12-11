import React, { useEffect, useState, useMemo } from 'react';
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
import type { Organization, CreateOrganizationRequest } from '../types/api';

export const AdminOrganizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateOrganizationRequest>({
    name: '',
    description: '',
  });
  const pageSize = 10;

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch all organizations for client-side sorting and pagination
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
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleSort = (key: string) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
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

  // Filter organizations based on search query
  const filteredOrganizations = useMemo(() => {
    if (!searchQuery) return allOrganizations;
    const query = searchQuery.toLowerCase();
    return allOrganizations.filter(org => 
      org.name.toLowerCase().includes(query) ||
      (org.description && org.description.toLowerCase().includes(query))
    );
  }, [allOrganizations, searchQuery]);

  // Sort organizations based on sortConfig
  const sortedOrganizations = useMemo(() => {
    const sorted = [...filteredOrganizations];
    sorted.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortConfig.key) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [filteredOrganizations, sortConfig.key, sortConfig.direction]);

  // Paginate the sorted organizations
  const paginatedOrganizations = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedOrganizations.slice(startIndex, endIndex);
  }, [sortedOrganizations, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedOrganizations.length / pageSize);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

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
        <span className={org.description ? 'text-truncate' : 'text-secondary'}>
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
            Showing {paginatedOrganizations.length > 0 ? ((currentPage - 1) * pageSize + 1) : 0} - {Math.min(currentPage * pageSize, sortedOrganizations.length)} of {sortedOrganizations.length} organizations
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
