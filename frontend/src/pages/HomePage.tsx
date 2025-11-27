import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useRoleBasedNavigation } from '../hooks/useRoleBasedNavigation';

export const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { navigateToDefaultRoute } = useRoleBasedNavigation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Auto-redirect authenticated users to their appropriate landing page
  useEffect(() => {
    const redirectAuthenticatedUser = async () => {
      if (isAuthenticated && user && !isRedirecting) {
        setIsRedirecting(true);
        await navigateToDefaultRoute(user, { replace: true });
      }
    };
    redirectAuthenticatedUser();
  }, [isAuthenticated, user, navigateToDefaultRoute]);

  // Show loading while redirecting authenticated users
  if (isAuthenticated && isRedirecting) {
    return (
      <div className="home-page">
        <h2>Redirecting...</h2>
      </div>
    );
  }

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
          <Link to="/me/home" style={{ color: '#0066cc', fontSize: '1.1rem' }}>
            Go to Dashboard →
          </Link>
        </div>
      )}
    </div>
  );
};
