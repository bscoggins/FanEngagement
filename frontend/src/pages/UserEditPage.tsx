import React from 'react';
import { useParams, Link } from 'react-router-dom';

export const UserEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="user-edit-page">
      <h2>Edit User</h2>
      <p>User ID: {id}</p>
      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p style={{ margin: 0, marginBottom: '0.5rem' }}>
          <strong>Placeholder:</strong> This page will provide a form to edit user details.
        </p>
        <Link to="/users" style={{ color: '#0066cc' }}>
          ← Back to Users
        </Link>
      </div>
    </div>
  );
};
