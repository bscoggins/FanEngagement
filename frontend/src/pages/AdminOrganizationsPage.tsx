import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import './AdminPage.css';

const PAGE_SIZE = 10;

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

  const fetchOrganizations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await organizationsApi.getAll();
      setAllOrganizations(data);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const searchFields = useCallback(
    (org: Organization) => [org.name, org.description ?? ''],
    []
  );

  const customSortFields = useMemo(
    () => ({
      name: (org: Organization) => org.name.toLowerCase(),
      created: (org: Organization) => new Date(org.createdAt),
    }),
    []
  );

  const {
    paginatedData: paginatedOrganizations,
    sortedData: sortedOrganizations,
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
    searchFields,
    customSortFields,
    initialSortConfig: { key: 'name', direction: 'asc' },
    pageSize: PAGE_SIZE,
    componentName: 'AdminOrganizationsPage',
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateOrganization = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsCreating(true);
      const newOrg = await organizationsApi.create(createFormData);
      showSuccess('Organization created successfully');
      await fetchOrganizations();
      setShowCreateForm(false);
      setCreateFormData({ name: '', description: '' });
      navigate(`/admin/organizations/${newOrg.id}/edit`);
    } catch (err) {
      console.error('Failed to create organization:', err);
      showError(parseApiError(err));
    } finally {
      setIsCreating(false);
    }
  };

  const columns = useMemo<TableColumn<Organization>[]>(
    () => [
      {
        key: 'name',
        label: 'Organization',
        sortable: true,
        render: (org) => (
          <div>
            <div style={{ fontWeight: 600 }}>{org.name}</div>
            {org.description && (
              <div className="admin-secondary-text" style={{ marginTop: 'var(--spacing-1)' }}>
                {org.description}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'created',
        label: 'Created',
        sortable: true,
        render: (org) => (
          <span className="admin-secondary-text">
            {new Date(org.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'center',
        render: (org) => (
          <div className="admin-table-actions">
            <Button
              size="sm"
              variant="primary"
              className="admin-table-action"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/organizations/${org.id}/edit`);
              }}
            >
              Manage
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="admin-table-action admin-table-action-muted"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/organizations/${org.id}/memberships`);
              }}
            >
              Members
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="admin-table-action admin-table-action-subtle"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/organizations/${org.id}/share-types`);
              }}
            >
              Share Types
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="admin-table-action admin-table-action-outline"
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
    ],
    [navigate]
  );

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-card compact">
          <h1>Organization Management</h1>
          <LoadingSpinner message="Loading organizations..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-card compact">
          <h1>Organization Management</h1>
          <ErrorMessage message={error} onRetry={fetchOrganizations} />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1>Organization Management</h1>
          <div className="admin-page-subtitle">
            Browse every organization, jump into settings, and create new governance spaces.
          </div>
        </div>
        <Button
          variant={showCreateForm ? 'ghost' : 'primary'}
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          {showCreateForm ? 'Close form' : 'Create Organization'}
        </Button>
      </div>

      {showCreateForm && (
        <div className="admin-card" style={{ marginBottom: 'var(--spacing-6)' }}>
          <h2 style={{ marginTop: 0 }}>Create New Organization</h2>
          <p className="admin-secondary-text" style={{ marginTop: 'var(--spacing-1)', marginBottom: 'var(--spacing-5)' }}>
            Provide a name and optional description. Configure share types, memberships, and proposals after creation.
          </p>
          <form
            onSubmit={handleCreateOrganization}
            className="admin-form"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}
          >
            <div>
              <label htmlFor="name" className="admin-form-label">
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                required
                maxLength={200}
                disabled={isCreating}
                className="admin-input"
              />
            </div>

            <div>
              <label htmlFor="description" className="admin-form-label">
                Description
              </label>
              <textarea
                id="description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                maxLength={1000}
                disabled={isCreating}
                rows={4}
                className="admin-textarea"
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
              <Button type="submit" variant="primary" isLoading={isCreating} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Organization'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isCreating}
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateFormData({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div
        className="admin-card compact"
        style={{
          marginBottom: 'var(--spacing-5)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--spacing-4)',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by organization name"
        />
        <div className="admin-secondary-text">
          Showing {paginatedOrganizations.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}
          {' '}to {Math.min(currentPage * PAGE_SIZE, sortedOrganizations.length)} of {sortedOrganizations.length}
        </div>
      </div>

      {paginatedOrganizations.length === 0 ? (
        <EmptyState message={searchQuery ? 'No organizations found matching your search.' : 'No organizations found.'} />
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
