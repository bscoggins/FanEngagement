import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { Table, type TableColumn } from '../components/Table';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { parseApiError } from '../utils/errorUtils';
import { useTableData } from '../hooks/useTableData';
import type { User } from '../types/api';

const PAGE_SIZE = 10;

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch all users for client-side sorting, filtering, and pagination
      // This approach provides consistent sorting across all pages and immediate search feedback
      // Trade-off: Performance may degrade with very large datasets (consider server-side for 1000+ users)
      const data = await usersApi.getAll();
      setAllUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Memoize search fields function to prevent unnecessary recalculations
  const searchFields = useCallback((user: User) => [user.displayName, user.email], []);

  // Memoize custom sort fields to prevent unnecessary recalculations
  const customSortFields = useMemo(() => ({
    name: (user: User) => user.displayName.toLowerCase(),
    email: (user: User) => user.email.toLowerCase(),
    created: (user: User) => new Date(user.createdAt),
  }), []);

  const {
    paginatedData: paginatedUsers,
    sortedData: sortedUsers,
    currentPage,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    setCurrentPage,
    handleSort,
    sortConfig,
  } = useTableData({
    data: allUsers,
    searchQuery,
    searchFields,
    initialSortConfig: { key: 'name', direction: 'asc' },
    customSortFields,
    pageSize: PAGE_SIZE,
    componentName: 'AdminUsersPage',
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const columns = useMemo<TableColumn<User>[]>(
    () => [
      {
        key: 'name',
        label: 'Name',
        render: (user) => user.displayName,
        sortable: true,
      },
      {
        key: 'email',
        label: 'Email',
        render: (user) => user.email,
        sortable: true,
      },
      {
        key: 'role',
        label: 'Role',
        render: (user) => (
          <Badge variant={user.role === 'Admin' ? 'info' : 'neutral'}>
            {user.role}
          </Badge>
        ),
        align: 'left',
      },
      {
        key: 'created',
        label: 'Created',
        render: (user) => (
          <span className="text-secondary-color text-sm">
            {new Date(user.createdAt).toLocaleDateString()}
          </span>
        ),
        sortable: true,
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'center',
        render: (user) => (
          <div className="table-actions">
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/users/${user.id}`);
              }}
            >
              Edit
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  if (isLoading) {
    return (
      <div>
        <h1 data-testid="users-heading">User Management</h1>
        <LoadingSpinner message="Loading users..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 data-testid="users-heading">User Management</h1>
        <ErrorMessage message={error} onRetry={() => fetchUsers()} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 data-testid="users-heading">User Management</h1>
        <Button
          variant="primary"
          onClick={() => navigate('/admin/users/new')}
        >
          Create User
        </Button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name or email..."
        />
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          <span>
            Showing {paginatedUsers.length > 0 ? ((currentPage - 1) * PAGE_SIZE + 1) : 0} - {Math.min(currentPage * PAGE_SIZE, sortedUsers.length)} of {sortedUsers.length} users
          </span>
        </div>
      </div>
      
      {paginatedUsers.length === 0 ? (
        <EmptyState message={searchQuery ? "No users found matching your search." : "No users found."} />
      ) : (
        <>
          <Table
            data={paginatedUsers}
            columns={columns}
            getRowKey={(user) => user.id}
            mobileLayout="card"
            sortConfig={sortConfig}
            onSort={handleSort}
            testId="users-table"
            caption="List of users in the system"
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
