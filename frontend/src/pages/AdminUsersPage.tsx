import React from 'react';
import { Link } from 'react-router-dom';

export const AdminUsersPage: React.FC = () => {
  return (
    <div>
      <h1>User Management</h1>
      <p>Manage user accounts, roles, and permissions.</p>
      
      <div style={{ 
        marginTop: '2rem', 
        padding: '2rem', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          This is a placeholder page. User management features will be implemented here.
        </p>
        <p style={{ color: '#999', fontSize: '0.9rem' }}>
          For now, you can manage users through the <Link to="/users" style={{ color: '#007bff' }}>Users page</Link> in the main application.
        </p>
      </div>
    </div>
  );
};
