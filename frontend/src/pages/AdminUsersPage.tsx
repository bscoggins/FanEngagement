import React, { useEffect, useState, useMemo } from 'react';
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
import type { User } from '../types/api';

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  });
  const pageSize = 10;

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch all users for client-side sorting and pagination
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
    setCurrentPage(1); // Reset to first page when sort changes
  };

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return allUsers;
    const query = searchQuery.toLowerCase();
    return allUsers.filter(user => 
      user.displayName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  }, [allUsers, searchQuery]);

  // Sort users based on sortConfig
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    sorted.sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;

      switch (sortConfig.key) {
        case 'name':
          aValue = a.displayName.toLowerCase();
          bValue = b.displayName.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          console.warn(`AdminUsersPage: Unknown sort key "${sortConfig.key}" encountered in sort logic. Attempting generic comparison. Please update the sort logic to handle this key.`);
          // Generic fallback: access property dynamically
          const rawA = (a as any)[sortConfig.key];
          const rawB = (b as any)[sortConfig.key];
          
          // Handle null/undefined values
          if (rawA == null && rawB == null) return 0;
          if (rawA == null) return 1;
          if (rawB == null) return -1;
          
          // Convert to comparable values
          aValue = typeof rawA === 'string' ? rawA.toLowerCase() : rawA;
          bValue = typeof rawB === 'string' ? rawB.toLowerCase() : rawB;
          break;
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
  }, [filteredUsers, sortConfig]);

  // Paginate the sorted users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedUsers.slice(startIndex, endIndex);
  }, [sortedUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedUsers.length / pageSize);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

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
        <span className="text-secondary">
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
          <span>
            Showing {paginatedUsers.length > 0 ? ((currentPage - 1) * pageSize + 1) : 0} - {Math.min(currentPage * pageSize, sortedUsers.length)} of {sortedUsers.length} users
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
