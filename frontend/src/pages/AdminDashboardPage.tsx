import React from 'react';
import { Link } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the FanEngagement administration area.</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem', 
        marginTop: '2rem' 
      }}>
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Users</h2>
          <p style={{ color: '#666' }}>Manage user accounts and permissions</p>
          <Link to="/admin/users" style={{ 
            color: '#007bff', 
            textDecoration: 'none', 
            fontWeight: 500 
          }}>
            Go to Users →
          </Link>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Organizations</h2>
          <p style={{ color: '#666' }}>Manage organizations and memberships</p>
          <Link to="/admin/organizations" style={{ 
            color: '#007bff', 
            textDecoration: 'none', 
            fontWeight: 500 
          }}>
            Go to Organizations →
          </Link>
        </div>

        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Dev Tools</h2>
          <p style={{ color: '#666' }}>Development and testing utilities</p>
          <Link to="/admin/dev-tools" style={{ 
            color: '#007bff', 
            textDecoration: 'none', 
            fontWeight: 500 
          }}>
            Go to Dev Tools →
          </Link>
        </div>
      </div>
    </div>
  );
};
