import React from 'react';
import { Link } from 'react-router-dom';

export const UsersPage: React.FC = () => {
  return (
    <div className="users-page">
      <h2>Users</h2>
      <p>Users list page - placeholder for now</p>
      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p style={{ margin: 0 }}>
          <strong>Placeholder:</strong> This page will display a list of users and provide navigation to edit individual users.
        </p>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/users/sample-id/edit" style={{ color: '#0066cc' }}>
            Example: Edit User (sample-id)
          </Link>
        </div>
      </div>
    </div>
  );
};
