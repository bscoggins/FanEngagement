import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { parseApiError } from '../utils/errorUtils';
import type { User, PagedResult } from '../types/api';

export const AdminUsersPage: React.FC = () => {
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
        <h1>User Management</h1>
        <LoadingSpinner message="Loading users..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>User Management</h1>
        <ErrorMessage message={error} onRetry={() => fetchUsers(currentPage, searchQuery)} />
      </div>
    );
  }

  const users = pagedResult?.items || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>User Management</h1>
        <Link
          to="/users/new"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Create User
        </Link>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by name or email..."
        />
        <div style={{ color: '#666', fontSize: '0.875rem' }}>
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
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Created</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '1rem' }}>{user.displayName}</td>
                    <td style={{ padding: '1rem' }}>{user.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        backgroundColor: user.role === 'Admin' ? '#e3f2fd' : '#f5f5f5',
                        color: user.role === 'Admin' ? '#1976d2' : '#666',
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#666', fontSize: '0.9rem' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <Link
                        to={`/admin/users/${user.id}`}
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
