import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      <h2>Welcome to FanEngagement</h2>
      <p>A multi-tenant fan governance platform where organizations issue share types to users for voting on proposals.</p>
      
      {!isAuthenticated ? (
        <div style={{ marginTop: '2rem' }}>
          <Link to="/login" style={{ color: '#0066cc', fontSize: '1.1rem' }}>
            Get started by logging in →
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: '2rem' }}>
          <Link to="/users" style={{ color: '#0066cc', fontSize: '1.1rem' }}>
            View Users →
          </Link>
        </div>
      )}
    </div>
  );
};
