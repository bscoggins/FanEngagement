import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import type { User, PagedResult } from '../types/api';

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [pagedResult, setPagedResult] = useState<PagedResult<User> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const pageSize = 10;

  const fetchUsers = async (page: number, search: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await usersApi.getAllPaged(page, pageSize, search || undefined);
      setPagedResult(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

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
        <ErrorMessage message={error} onRetry={() => fetchUsers(currentPage, searchQuery)} />
      </div>
    );
  }

  const users = pagedResult?.items || [];

  const columns: TableColumn<User>[] = [
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
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
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
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 data-testid="users-heading">User Management</h1>
        <Button
          variant="primary"
          onClick={() => navigate('/users/new')}
        >
          Create User
        </Button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by name or email..."
        />
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          {pagedResult && (
            <span>
              Showing {users.length > 0 ? ((currentPage - 1) * pageSize + 1) : 0} - {Math.min(currentPage * pageSize, pagedResult.totalCount)} of {pagedResult.totalCount} users
            </span>
          )}
        </div>
      </div>
      
      {users.length === 0 ? (
        <EmptyState message={searchQuery ? "No users found matching your search." : "No users found."} />
      ) : (
        <>
          <Table
            data={users}
            columns={columns}
            getRowKey={(user) => user.id}
            mobileLayout="card"
            testId="users-table"
            caption="List of users in the system"
          />

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
