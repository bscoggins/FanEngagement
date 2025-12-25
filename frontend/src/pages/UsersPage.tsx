import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Table, type TableColumn } from '../components/Table';
import { usersApi } from '../api/usersApi';
import type { User } from '../types/api';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userColumns = useMemo<TableColumn<User>[]>(() => [
    {
      key: 'name',
      label: 'Name',
      render: (user) => user.displayName,
    },
    {
      key: 'email',
      label: 'Email',
      render: (user) => user.email,
    },
    {
      key: 'createdAt',
      label: 'Created At',
      render: (user) => new Date(user.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center',
      render: (user) => (
        <Link
          to={`/users/${user.id}/edit`}
          style={{
            color: '#0066cc',
            textDecoration: 'none',
          }}
        >
          Edit
        </Link>
      ),
    },
  ], []);

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

      <Table<User>
        data={users}
        columns={userColumns}
        getRowKey={(user) => user.id}
        mobileLayout="card"
        caption="List of users"
        emptyMessage="No users found. Create a user to get started."
      />
    </div>
  );
};
