import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import type { User } from '../types/api';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await usersApi.getAll();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError('Failed to load users. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="users-page">
        <h2>Users</h2>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="users-page">
        <h2>Users</h2>
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33',
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Users</h2>
        <Link
          to="/users/new"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0066cc',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          Create User
        </Link>
      </div>

      {users.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          No users found. Create a user to get started.
        </div>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #ddd',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Email</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Created At</th>
              <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '0.75rem' }}>{user.displayName}</td>
                <td style={{ padding: '0.75rem' }}>{user.email}</td>
                <td style={{ padding: '0.75rem' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                  <Link
                    to={`/users/${user.id}/edit`}
                    style={{
                      color: '#0066cc',
                      textDecoration: 'none',
                    }}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
