import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { organizationsApi } from '../api/organizationsApi';
import { usersApi } from '../api/usersApi';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { Table, type TableColumn } from '../components/Table';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Toggle } from '../components/Toggle';
import { FormErrorSummary } from '../components/FormErrorSummary';
import { parseApiError } from '../utils/errorUtils';
import { useNotifications } from '../contexts/NotificationContext';
import { useTableData } from '../hooks/useTableData';
import { Skeleton, SkeletonTable, SkeletonTextLines } from '../components/Skeleton';
import type { Organization, CreateOrganizationRequest, User, BlockchainType } from '../types/api';
import './AdminPage.css';
import { validateBlockchainConfig } from '../utils/blockchainExplorer';

const PAGE_SIZE = 10;
const DEFAULT_BLOCKCHAIN_TYPE: BlockchainType = 'None';
const initialCreateFormState: CreateOrganizationRequest = {
  name: '',
  description: '',
  logoUrl: '',
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  blockchainType: DEFAULT_BLOCKCHAIN_TYPE,
  blockchainConfig: '',
  enableBlockchainFeature: false,
  initialAdminUserId: '',
};

export const AdminOrganizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useNotifications();
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateOrganizationRequest>({ ...initialCreateFormState });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreateForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (showCreateForm) {
      const fetchUsers = async () => {
        try {
          const data = await usersApi.getAll();
          setUsers(data);
        } catch (err) {
          console.error('Failed to fetch users:', err);
          showError('Failed to load users list');
        }
      };
      fetchUsers();
    }
  }, [showCreateForm, showError]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const validationErrors: Record<string, string> = {};
    if (!createFormData.name.trim()) {
      validationErrors.name = 'Organization name is required';
    }
    if (!createFormData.initialAdminUserId) {
      validationErrors.initialAdmin = 'Select an initial organization admin';
    }
    if (createFormData.blockchainType !== DEFAULT_BLOCKCHAIN_TYPE) {
      const configErrors = validateBlockchainConfig(createFormData.blockchainType ?? DEFAULT_BLOCKCHAIN_TYPE, createFormData.blockchainConfig);
      if (configErrors.length > 0) {
        validationErrors.blockchainConfig = configErrors.join(' ');
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});

    try {
      setIsCreating(true);
      const newOrg = await organizationsApi.create(createFormData);
      showSuccess('Organization created successfully');
      await fetchOrganizations();
      setShowCreateForm(false);
      setCreateFormData({ ...initialCreateFormState });
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
        <div className="admin-card compact" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }} role="status" aria-live="polite">
          <h1>Organization Management</h1>
          <SkeletonTextLines count={2} widths={['65%', '45%']} />
          <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
            <Skeleton width="14rem" height="2.75rem" />
            <Skeleton width="10rem" height="2.75rem" />
          </div>
          <SkeletonTable columns={4} rows={6} />
          <p className="admin-secondary-text">Loading organizations...</p>
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
          <FormErrorSummary
            errors={Object.entries(formErrors).map(([fieldId, message]) => ({ fieldId, message }))}
          />
          <form
            onSubmit={handleCreateOrganization}
            className="admin-form"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
              <Input
                id="name"
                label="Name"
                type="text"
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                required
                maxLength={200}
                disabled={isCreating}
                className="admin-input"
                error={formErrors.name}
              />
              
              <Select
                id="initialAdmin"
                label="Initial Organization Admin"
                value={createFormData.initialAdminUserId || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, initialAdminUserId: e.target.value })}
                disabled={isCreating}
                required
                helperText="This user will be assigned as the Organization Admin."
                error={formErrors.initialAdmin}
              >
                <option value="">Select a user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} ({user.email})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="description" className="form-field__label admin-form-label">
                Description
              </label>
              <textarea
                id="description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                maxLength={1000}
                disabled={isCreating}
                rows={3}
                className="form-control form-control--textarea admin-textarea"
              />
            </div>

            <h3 style={{ fontSize: '1.1rem', marginTop: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>Branding</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-4)' }}>
              <Input
                id="logoUrl"
                label="Logo URL"
                type="url"
                value={createFormData.logoUrl || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, logoUrl: e.target.value })}
                disabled={isCreating}
                className="admin-input"
                placeholder="https://example.com/logo.png"
              />
              
              <Input
                id="primaryColor"
                label="Primary Color"
                type="color"
                value={createFormData.primaryColor || '#000000'}
                onChange={(e) => setCreateFormData({ ...createFormData, primaryColor: e.target.value })}
                disabled={isCreating}
                className="admin-input"
                style={{ height: '42px', padding: '4px' }}
              />
              
              <Input
                id="secondaryColor"
                label="Secondary Color"
                type="color"
                value={createFormData.secondaryColor || '#ffffff'}
                onChange={(e) => setCreateFormData({ ...createFormData, secondaryColor: e.target.value })}
                disabled={isCreating}
                className="admin-input"
                style={{ height: '42px', padding: '4px' }}
              />
            </div>

            <h3 style={{ fontSize: '1.1rem', marginTop: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>Blockchain Configuration</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-4)' }}>
              <div>
                <label htmlFor="blockchainType" className="form-field__label admin-form-label">
                  Blockchain Network
                </label>
                <select
                  id="blockchainType"
                  value={createFormData.blockchainType}
                  onChange={(e) => setCreateFormData({ ...createFormData, blockchainType: e.target.value as BlockchainType })}
                  className="form-control admin-input"
                  disabled={isCreating}
                >
                  <option value={DEFAULT_BLOCKCHAIN_TYPE}>None</option>
                  <option value="Solana">Solana</option>
                  <option value="Polygon">Polygon</option>
                </select>
              </div>
              
              {createFormData.blockchainType !== DEFAULT_BLOCKCHAIN_TYPE ? (
                <div>
                  <label htmlFor="blockchainConfig" className="form-field__label admin-form-label">
                    Configuration (JSON)
                  </label>
                  <Input
                    id="blockchainConfig"
                    type="text"
                    value={createFormData.blockchainConfig || ''}
                    onChange={(e) => setCreateFormData({ ...createFormData, blockchainConfig: e.target.value })}
                    disabled={isCreating}
                    className="admin-input"
                    placeholder='{"network": "devnet"}'
                    error={formErrors.blockchainConfig}
                  />
                </div>
              ) : (
                <div /> /* Spacer */
              )}

              <div style={{ gridColumn: '1 / -1', marginTop: 'var(--spacing-2)' }}>
                <Toggle
                  id="enableBlockchainFeature"
                  checked={createFormData.enableBlockchainFeature || false}
                  onChange={(e) => setCreateFormData({ ...createFormData, enableBlockchainFeature: e.target.checked })}
                  disabled={isCreating}
                  label="Enable Blockchain Integration Feature Flag"
                  helperText="Enables blockchain-related features for this organization."
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap', marginTop: 'var(--spacing-4)' }}>
              <Button type="submit" variant="primary" isLoading={isCreating} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Organization'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isCreating}
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateFormData({ 
                    ...initialCreateFormState
                  });
                  setFormErrors({});
                  if (searchParams.get('action') === 'create') {
                    setSearchParams({});
                  }
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
